#!/usr/bin/env node
// TBA — detect current sprint for a Jira issue.
//
// Priority:
//   1. Parse Jira sprint field (customfield_10020) on the issue
//   2. Fallback: look at existing e2e/playwright/sprint*/ folders, pick latest
//   3. Fallback: ask user
//
// CLI:
//   node sprint.mjs detect RTRCDS-1235
//   node sprint.mjs latest-folder /path/to/web/e2e/playwright

import { loadConfig } from './config.mjs';
import { JiraClient } from './jira.mjs';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

export async function detectSprintFromJira(key) {
  const cfg = await loadConfig();
  const jira = new JiraClient(cfg);
  const issue = await jira.getIssue(key);
  const sprintField = issue.sprintField;
  if (Array.isArray(sprintField) && sprintField.length > 0) {
    // Jira returns an array of sprint objects (most recent last)
    const active = sprintField.find((s) => s.state === 'active') || sprintField[sprintField.length - 1];
    if (active?.name) {
      // Extract sprint number if name like "Sprint 16" or just use name sanitized
      const m = active.name.match(/(\d+)/);
      return m ? `sprint${m[1]}` : _sanitize(active.name);
    }
  }
  return null;
}

export function latestSprintFolder(playwrightRoot) {
  if (!existsSync(playwrightRoot)) return null;
  const sprints = readdirSync(playwrightRoot)
    .filter((n) => /^sprint\d+$/i.test(n))
    .sort((a, b) => _sprintNum(b) - _sprintNum(a));
  return sprints[0] || null;
}

function _sprintNum(name) {
  const m = name.match(/sprint(\d+)/i);
  return m ? parseInt(m[1], 10) : 0;
}

function _sanitize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── CLI ──────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, arg] = process.argv.slice(2);
  try {
    if (cmd === 'detect') {
      if (!arg) { console.error('Usage: sprint.mjs detect <KEY>'); process.exit(2); }
      const r = await detectSprintFromJira(arg);
      if (r) { console.log(r); process.exit(0); }
      else { console.error('no sprint on issue'); process.exit(1); }
    } else if (cmd === 'latest-folder') {
      if (!arg) { console.error('Usage: sprint.mjs latest-folder <playwright-root>'); process.exit(2); }
      const r = latestSprintFolder(arg);
      if (r) { console.log(r); process.exit(0); }
      else { console.error('no sprint folders'); process.exit(1); }
    } else {
      console.log('Usage: sprint.mjs [detect <KEY> | latest-folder <path>]');
    }
  } catch (err) {
    console.error(`[⚠ NEXUS EVENT] ${err.message}`);
    process.exit(1);
  }
}
