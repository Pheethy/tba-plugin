#!/usr/bin/env node
// TBA — Jira REST v3 client (read + write).
// Config loaded from ~/.tba/config.json via config.mjs.
//
// CLI:
//   node jira.mjs ping
//   node jira.mjs myself
//   node jira.mjs pick                      # list issues assigned to me (project.key)
//   node jira.mjs case RTRCDS-1234
//   node jira.mjs comment RTRCDS-1234 "body text"
//   node jira.mjs comment RTRCDS-1234 --stdin
//   node jira.mjs subtask RTRCDS-1234 "[HC-MY-CAREER-WEB] Render page"
//   node jira.mjs transitions RTRCDS-1234
//   node jira.mjs transition RTRCDS-1234 "READY TO TEST"

import { loadConfig } from './config.mjs';
import { readFileSync } from 'node:fs';

export class JiraClient {
  constructor(cfg) {
    const { site, email, token, project } = cfg.jira;
    if (!email || !token) {
      throw new Error('Jira credentials missing. Run /tba:brief to set them up.');
    }
    this.site = site;
    this.project = project;
    this.base = `https://${site}/rest/api/3`;
    this.authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
  }

  async _fetch(path, { method = 'GET', body, query } = {}) {
    let url = this.base + path;
    if (query) {
      const qs = new URLSearchParams(query).toString();
      url += (url.includes('?') ? '&' : '?') + qs;
    }
    const headers = {
      Authorization: this.authHeader,
      Accept: 'application/json',
    };
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const data = text ? _tryJson(text) : null;
    if (!res.ok) {
      const msg = data?.errorMessages?.join('; ') || data?.message || text || res.statusText;
      const err = new Error(`Jira ${method} ${path} → ${res.status}: ${msg}`);
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  }

  // ─── Read ─────────────────────────────────────────
  async myself() {
    return this._fetch('/myself');
  }

  async ping() {
    const me = await this.myself();
    return {
      ok: true,
      accountId: me.accountId,
      displayName: me.displayName,
      email: me.emailAddress,
    };
  }

  // Return issues assigned to current user in project, unresolved first
  // Scope: current (open) sprint only, include DONE so Agent can review
  // completed work (QA follow-up, revisit merged subtasks, etc.)
  async pickAssigned({ limit = 50 } = {}) {
    const jql =
      `project = ${this.project} AND assignee = currentUser() ` +
      `AND sprint in openSprints() ORDER BY status ASC, updated DESC`;
    const data = await this._fetch('/search/jql', {
      method: 'POST',
      body: {
        jql,
        fields: ['summary', 'status', 'issuetype', 'priority', 'updated', 'parent', 'customfield_10020'],
        maxResults: limit,
      },
    });
    return (data.issues || []).map((i) => {
      const sprintField = i.fields.customfield_10020 || [];
      const active = Array.isArray(sprintField)
        ? sprintField.find((s) => s.state === 'active') || sprintField[sprintField.length - 1]
        : null;
      return {
        key: i.key,
        summary: i.fields.summary,
        status: i.fields.status?.name,
        statusCategory: i.fields.status?.statusCategory?.key,
        type: i.fields.issuetype?.name,
        priority: i.fields.priority?.name,
        updated: i.fields.updated,
        parent: i.fields.parent?.key,
        sprint: active?.name || null,
      };
    });
  }

  async getIssue(key) {
    const i = await this._fetch(
      `/issue/${encodeURIComponent(key)}?fields=summary,description,status,issuetype,priority,assignee,reporter,parent,subtasks,labels,customfield_10020`
    );
    return {
      key: i.key,
      summary: i.fields.summary,
      description: _adfToMd(i.fields.description),
      descriptionAdf: i.fields.description,
      status: i.fields.status?.name,
      type: i.fields.issuetype?.name,
      priority: i.fields.priority?.name,
      assignee: i.fields.assignee?.displayName,
      reporter: i.fields.reporter?.displayName,
      parent: i.fields.parent?.key,
      subtasks: (i.fields.subtasks || []).map((s) => ({
        key: s.key,
        summary: s.fields?.summary,
        status: s.fields?.status?.name,
      })),
      labels: i.fields.labels || [],
      sprintField: i.fields.customfield_10020 || null,
    };
  }

  // ─── Write ────────────────────────────────────────
  async addComment(key, markdown) {
    return this._fetch(`/issue/${encodeURIComponent(key)}/comment`, {
      method: 'POST',
      body: { body: _mdToAdf(markdown) },
    });
  }

  // Create a subtask under parentKey.
  // summary should already include the [REPO-NAME] prefix.
  async createSubtask(parentKey, { summary, description = '' }) {
    // Need the subtask issue type id for this project
    const types = await this._fetch(`/project/${encodeURIComponent(this.project)}`);
    const subType = (types.issueTypes || []).find((t) => t.subtask === true);
    if (!subType) {
      throw new Error(`No subtask issue type found in project ${this.project}`);
    }
    return this._fetch('/issue', {
      method: 'POST',
      body: {
        fields: {
          project: { key: this.project },
          parent: { key: parentKey },
          summary,
          issuetype: { id: subType.id },
          description: description ? _mdToAdf(description) : undefined,
        },
      },
    });
  }

  async listTransitions(key) {
    const data = await this._fetch(`/issue/${encodeURIComponent(key)}/transitions`);
    return (data.transitions || []).map((t) => ({ id: t.id, name: t.name, to: t.to?.name }));
  }

  async transitionIssue(key, transitionName) {
    const list = await this.listTransitions(key);
    const t = list.find(
      (x) => x.name.toLowerCase() === transitionName.toLowerCase() ||
             x.to?.toLowerCase() === transitionName.toLowerCase()
    );
    if (!t) {
      throw new Error(
        `No transition "${transitionName}" for ${key}. Available: ${list.map((x) => x.name).join(', ')}`
      );
    }
    await this._fetch(`/issue/${encodeURIComponent(key)}/transitions`, {
      method: 'POST',
      body: { transition: { id: t.id } },
    });
    return t;
  }
}

// ─── ADF helpers (minimal — enough for round-trip of plain text / markdown) ──
function _mdToAdf(markdown) {
  // Minimal ADF wrapper — paragraphs separated by blank lines.
  // Preserves code fences as codeBlock nodes.
  const content = [];
  const blocks = markdown.split(/\n{2,}/);
  for (const block of blocks) {
    const fence = block.match(/^```(\w*)\n([\s\S]*?)\n```$/);
    if (fence) {
      content.push({
        type: 'codeBlock',
        attrs: fence[1] ? { language: fence[1] } : {},
        content: [{ type: 'text', text: fence[2] }],
      });
    } else {
      const lines = block.split('\n');
      const paraContent = [];
      lines.forEach((l, i) => {
        if (l) paraContent.push({ type: 'text', text: l });
        if (i < lines.length - 1) paraContent.push({ type: 'hardBreak' });
      });
      content.push({ type: 'paragraph', content: paraContent.length ? paraContent : [{ type: 'text', text: ' ' }] });
    }
  }
  return { type: 'doc', version: 1, content };
}

function _adfToMd(adf) {
  if (!adf?.content) return '';
  const out = [];
  for (const node of adf.content) {
    out.push(_adfNode(node));
  }
  return out.join('\n\n').trim();
}

function _adfNode(node) {
  if (!node) return '';
  switch (node.type) {
    case 'paragraph':
      return (node.content || []).map(_adfNode).join('');
    case 'text':
      return node.text || '';
    case 'hardBreak':
      return '\n';
    case 'codeBlock':
      return '```' + (node.attrs?.language || '') + '\n' + (node.content || []).map(_adfNode).join('') + '\n```';
    case 'bulletList':
    case 'orderedList':
      return (node.content || []).map((li, i) =>
        (node.type === 'orderedList' ? `${i + 1}. ` : '- ') + _adfNode(li).trim()
      ).join('\n');
    case 'listItem':
      return (node.content || []).map(_adfNode).join('');
    case 'heading': {
      const level = node.attrs?.level || 1;
      return '#'.repeat(level) + ' ' + (node.content || []).map(_adfNode).join('');
    }
    default:
      if (node.content) return node.content.map(_adfNode).join('');
      return '';
  }
}

function _tryJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

// ─── CLI ──────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...args] = process.argv.slice(2);
  try {
    const cfg = await loadConfig();
    if (!cfg) {
      console.error('No config. Run /tba:brief first.');
      process.exit(1);
    }
    const jira = new JiraClient(cfg);
    switch (cmd) {
      case 'ping': {
        const r = await jira.ping();
        console.log(`[◉ CLEARED FOR DUTY] ${r.displayName} <${r.email}>`);
        break;
      }
      case 'myself': {
        console.log(JSON.stringify(await jira.myself(), null, 2));
        break;
      }
      case 'pick': {
        const list = await jira.pickAssigned({ limit: 50 });
        if (!list.length) {
          console.log('No cards assigned in the current sprint.');
          break;
        }
        const sprint = list.find((i) => i.sprint)?.sprint || '(no sprint)';
        console.log(`Sprint: ${sprint}  (${list.length} cards)`);
        for (const i of list) {
          console.log(`  ${i.key.padEnd(14)} ${(i.status || '').padEnd(14)} ${i.summary}`);
        }
        break;
      }
      case 'case': {
        if (!args[0]) { console.error('Usage: jira.mjs case <KEY>'); process.exit(2); }
        const i = await jira.getIssue(args[0]);
        console.log(JSON.stringify(i, null, 2));
        break;
      }
      case 'comment': {
        if (!args[0]) { console.error('Usage: jira.mjs comment <KEY> "body" | --stdin'); process.exit(2); }
        let body;
        if (args[1] === '--stdin' || !args[1]) {
          body = readFileSync(0, 'utf8');
        } else {
          body = args.slice(1).join(' ');
        }
        const r = await jira.addComment(args[0], body);
        console.log(`[✓ COMMENT POSTED] ${args[0]} (id=${r.id})`);
        break;
      }
      case 'subtask': {
        const [parent, ...summaryParts] = args;
        const summary = summaryParts.join(' ');
        if (!parent || !summary) {
          console.error('Usage: jira.mjs subtask <PARENT-KEY> "[REPO-NAME] title"'); process.exit(2);
        }
        const r = await jira.createSubtask(parent, { summary });
        console.log(`[✓ SUBTASK CREATED] ${r.key}  — ${summary}`);
        break;
      }
      case 'transitions': {
        if (!args[0]) { console.error('Usage: jira.mjs transitions <KEY>'); process.exit(2); }
        const list = await jira.listTransitions(args[0]);
        for (const t of list) console.log(`  ${t.id.padEnd(5)} ${t.name.padEnd(20)} → ${t.to}`);
        break;
      }
      case 'transition': {
        if (!args[0] || !args[1]) {
          console.error('Usage: jira.mjs transition <KEY> "<TRANSITION or STATUS>"'); process.exit(2);
        }
        const t = await jira.transitionIssue(args[0], args.slice(1).join(' '));
        console.log(`[✓ SUBMITTED] ${args[0]} → ${t.to}`);
        break;
      }
      default:
        console.log('Usage: jira.mjs [ping|myself|pick|case|comment|subtask|transitions|transition]');
    }
  } catch (err) {
    console.error(`[⚠ NEXUS EVENT] ${err.message}`);
    process.exit(1);
  }
}
