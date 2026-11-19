#!/usr/bin/env node
// TBA — per-card case state. One case file per Jira key so Agent can
// work multiple cards in parallel; an `active` pointer records which
// card is currently in focus.
//
// Layout (in CWD):
//   .tba/
//   ├── active                     # text file: "RTRCDS-1234"
//   └── cases/
//       └── RTRCDS-1234/
//           ├── case.json          # state
//           ├── plan.md            # (from /tba:design, moved from trials/)
//           └── log.jsonl          # append-only phase log
//
// Case state shape:
// {
//   "key": "RTRCDS-1234",
//   "summary": "...",
//   "startedAt": "2026-11-18T...",
//   "updatedAt": "...",
//   "phase": "intake" | "trial" | "post" | "subtask" | "build" | "ship" | "closed",
//   "auto": true,
//   "subtasks": {
//     "RTRCDS-1235": {
//       "summary": "[HC-MY-CAREER-API-EMPLOYEE] Create user API",
//       "repoName": "hc-my-career-api-employee",
//       "repoPath": "/abs/...",
//       "branch": "feature/rtrcds-1235",
//       "status": "pending" | "branched" | "implemented" | "e2e" | "shipped"
//     }
//   },
//   "gates": [
//     { "name": "subtask-create", "at": "...", "decision": "approved" }
//   ]
// }
//
// CLI:
//   node case-state.mjs active                   # print active key
//   node case-state.mjs show [KEY]               # print case.json
//   node case-state.mjs open <KEY> [summary]     # create + set active
//   node case-state.mjs set-active <KEY>
//   node case-state.mjs set-phase <phase> [KEY]
//   node case-state.mjs upsert-subtask <SUBKEY> <JSON>
//   node case-state.mjs record-gate <name> <decision> [note]
//   node case-state.mjs list                     # list all cases in CWD

import { mkdir, readFile, writeFile, readdir, appendFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

const TBA_DIR = '.tba';
const ACTIVE_FILE = path.join(TBA_DIR, 'active');
const CASES_DIR = path.join(TBA_DIR, 'cases');

const PHASES = ['intake', 'trial', 'post', 'subtask', 'build', 'ship', 'closed'];

export const CaseState = {
  async root(cwd = process.cwd()) {
    return { cwd, tba: path.join(cwd, TBA_DIR), cases: path.join(cwd, CASES_DIR) };
  },

  caseDir(key, cwd = process.cwd()) {
    return path.join(cwd, CASES_DIR, key);
  },

  caseFile(key, cwd = process.cwd()) {
    return path.join(this.caseDir(key, cwd), 'case.json');
  },

  async activeKey(cwd = process.cwd()) {
    const f = path.join(cwd, ACTIVE_FILE);
    if (!existsSync(f)) return null;
    const content = (await readFile(f, 'utf8')).trim();
    return content || null;
  },

  async setActive(key, cwd = process.cwd()) {
    await mkdir(path.join(cwd, TBA_DIR), { recursive: true });
    await writeFile(path.join(cwd, ACTIVE_FILE), key + '\n');
    return key;
  },

  async load(key, cwd = process.cwd()) {
    const f = this.caseFile(key, cwd);
    if (!existsSync(f)) return null;
    return JSON.parse(await readFile(f, 'utf8'));
  },

  async loadActive(cwd = process.cwd()) {
    const key = await this.activeKey(cwd);
    if (!key) return null;
    return this.load(key, cwd);
  },

  async save(state, cwd = process.cwd()) {
    if (!state?.key) throw new Error('case state requires .key');
    state.updatedAt = new Date().toISOString();
    const dir = this.caseDir(state.key, cwd);
    await mkdir(dir, { recursive: true });
    await writeFile(this.caseFile(state.key, cwd), JSON.stringify(state, null, 2));
    return state;
  },

  async open(key, { summary = '', auto = true } = {}, cwd = process.cwd()) {
    const existing = await this.load(key, cwd);
    if (existing) {
      await this.setActive(key, cwd);
      return { state: existing, created: false };
    }
    const now = new Date().toISOString();
    const state = {
      key,
      summary,
      startedAt: now,
      updatedAt: now,
      phase: 'intake',
      auto,
      subtasks: {},
      gates: [],
    };
    await this.save(state, cwd);
    await this.setActive(key, cwd);
    await this._log(key, { type: 'open', at: now, summary }, cwd);
    return { state, created: true };
  },

  async setPhase(phase, key, cwd = process.cwd()) {
    if (!PHASES.includes(phase)) throw new Error(`Unknown phase: ${phase}. Valid: ${PHASES.join(', ')}`);
    const resolvedKey = key || (await this.activeKey(cwd));
    const state = await this.load(resolvedKey, cwd);
    if (!state) throw new Error(`No case for ${resolvedKey}`);
    const prev = state.phase;
    state.phase = phase;
    await this.save(state, cwd);
    await this._log(resolvedKey, { type: 'phase', from: prev, to: phase, at: new Date().toISOString() }, cwd);
    return state;
  },

  async upsertSubtask(subKey, patch, key, cwd = process.cwd()) {
    const resolvedKey = key || (await this.activeKey(cwd));
    const state = await this.load(resolvedKey, cwd);
    if (!state) throw new Error(`No case for ${resolvedKey}`);
    state.subtasks[subKey] = { ...(state.subtasks[subKey] || {}), ...patch };
    await this.save(state, cwd);
    return state.subtasks[subKey];
  },

  async recordGate(name, decision, note, key, cwd = process.cwd()) {
    const resolvedKey = key || (await this.activeKey(cwd));
    const state = await this.load(resolvedKey, cwd);
    if (!state) throw new Error(`No case for ${resolvedKey}`);
    const entry = { name, decision, note: note || null, at: new Date().toISOString() };
    state.gates.push(entry);
    await this.save(state, cwd);
    await this._log(resolvedKey, { type: 'gate', ...entry }, cwd);
    return entry;
  },

  async list(cwd = process.cwd()) {
    const dir = path.join(cwd, CASES_DIR);
    if (!existsSync(dir)) return [];
    const entries = await readdir(dir);
    const results = [];
    for (const e of entries) {
      const stat = statSync(path.join(dir, e));
      if (!stat.isDirectory()) continue;
      const s = await this.load(e, cwd);
      if (s) results.push(s);
    }
    results.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    return results;
  },

  nextAction(state) {
    if (!state) return { label: 'no active case', hint: 'Open one with /tba:flow <KEY>' };
    switch (state.phase) {
      case 'intake':  return { label: 'Pre-Build Trial', command: '/tba:design ' + state.key };
      case 'trial':   return { label: 'Post plan to Jira', command: '/tba:post ' + state.key };
      case 'post':    return { label: 'Create subtasks', command: '/tba:subtask ' + state.key };
      case 'subtask': return { label: 'Pick a subtask to build', command: 'select from case.subtasks' };
      case 'build':   return { label: 'Finish build or start next subtask', command: '/tba:ship <SUBKEY>' };
      case 'ship':    return { label: 'Ship main card', command: '/tba:ship ' + state.key + ' --main' };
      case 'closed':  return { label: 'Case closed', command: null };
      default:        return { label: 'unknown phase', command: null };
    }
  },

  async _log(key, event, cwd = process.cwd()) {
    await mkdir(this.caseDir(key, cwd), { recursive: true });
    await appendFile(path.join(this.caseDir(key, cwd), 'log.jsonl'), JSON.stringify(event) + '\n');
  },
};

// ─── CLI ──────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...rest] = process.argv.slice(2);
  try {
    switch (cmd) {
      case 'active': {
        const k = await CaseState.activeKey();
        if (k) console.log(k);
        else { console.error('no active case'); process.exit(1); }
        break;
      }
      case 'show': {
        const key = rest[0] || (await CaseState.activeKey());
        if (!key) { console.error('no key'); process.exit(1); }
        const s = await CaseState.load(key);
        if (!s) { console.error(`no case for ${key}`); process.exit(1); }
        console.log(JSON.stringify(s, null, 2));
        break;
      }
      case 'open': {
        const key = rest[0];
        if (!key) { console.error('Usage: case-state.mjs open <KEY> [summary]'); process.exit(2); }
        const summary = rest.slice(1).join(' ');
        const r = await CaseState.open(key, { summary });
        console.log(JSON.stringify({ created: r.created, key: r.state.key, phase: r.state.phase }, null, 2));
        break;
      }
      case 'set-active': {
        if (!rest[0]) { console.error('Usage: set-active <KEY>'); process.exit(2); }
        await CaseState.setActive(rest[0]);
        console.log(`[◉ ACTIVE] ${rest[0]}`);
        break;
      }
      case 'set-phase': {
        const phase = rest[0];
        const key = rest[1];
        if (!phase) { console.error('Usage: set-phase <phase> [KEY]'); process.exit(2); }
        const s = await CaseState.setPhase(phase, key);
        console.log(`[◉ PHASE] ${s.key} → ${s.phase}`);
        break;
      }
      case 'upsert-subtask': {
        const [subKey, json] = rest;
        if (!subKey || !json) { console.error('Usage: upsert-subtask <SUBKEY> <JSON>'); process.exit(2); }
        const r = await CaseState.upsertSubtask(subKey, JSON.parse(json));
        console.log(JSON.stringify(r, null, 2));
        break;
      }
      case 'record-gate': {
        const [name, decision, ...noteParts] = rest;
        if (!name || !decision) { console.error('Usage: record-gate <name> <decision> [note]'); process.exit(2); }
        const r = await CaseState.recordGate(name, decision, noteParts.join(' '));
        console.log(JSON.stringify(r, null, 2));
        break;
      }
      case 'list': {
        const all = await CaseState.list();
        if (!all.length) { console.log('(no cases)'); break; }
        for (const s of all) {
          const active = (await CaseState.activeKey()) === s.key ? '●' : ' ';
          console.log(`${active} ${s.key.padEnd(14)} ${s.phase.padEnd(10)} ${s.summary || ''}`);
        }
        break;
      }
      case 'next': {
        const key = rest[0];
        const s = key ? await CaseState.load(key) : await CaseState.loadActive();
        console.log(JSON.stringify(CaseState.nextAction(s), null, 2));
        break;
      }
      default:
        console.log('Usage: case-state.mjs [active|show|open|set-active|set-phase|upsert-subtask|record-gate|list|next]');
    }
  } catch (err) {
    console.error(`[⚠ NEXUS EVENT] ${err.message}`);
    process.exit(1);
  }
}
