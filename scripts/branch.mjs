#!/usr/bin/env node
// TBA — create feature branch for a Jira subtask.
//
// Flow:
//   1. Fetch subtask title from Jira → parse [REPO-NAME] tag
//   2. Resolve repo path via repo-map
//   3. cd + git fetch origin
//   4. Check for uncommitted changes — abort if dirty (unless --force-dirty)
//   5. Determine base branch (default: main; fallback: master, develop)
//   6. git checkout -b feature/rtrcds-<id-lower> origin/<base>  OR  switch if already exists
//
// CLI:
//   node branch.mjs RTRCDS-1235
//   node branch.mjs RTRCDS-1235 --base develop
//   node branch.mjs RTRCDS-1235 --force-dirty

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadConfig } from './config.mjs';
import { JiraClient } from './jira.mjs';
import { resolveRepo } from './repo-map.mjs';

const exec = promisify(execFile);

export async function createBranchForSubtask(key, { base, forceDirty = false } = {}) {
  const cfg = await loadConfig();
  if (!cfg) throw new Error('No config. Run /tba:brief first.');
  const jira = new JiraClient(cfg);

  // 1. Fetch subtask
  const issue = await jira.getIssue(key);
  if (!issue.parent) {
    // Not strictly a subtask, but we allow branching any issue
  }

  // 2. Parse tag
  const tagInfo = resolveRepo(issue.summary, cfg);
  if (!tagInfo.ok) {
    return {
      ok: false,
      reason: 'repo_not_found',
      issue: { key: issue.key, summary: issue.summary },
      detail: tagInfo,
    };
  }

  const { repoPath, repoName, isDb, title } = tagInfo;

  // 3. git fetch
  try {
    await exec('git', ['-C', repoPath, 'fetch', 'origin', '--tags'], { timeout: 30000 });
  } catch (err) {
    return { ok: false, reason: 'fetch_failed', repoPath, error: err.message };
  }

  // 4. dirty check
  const { stdout: status } = await exec('git', ['-C', repoPath, 'status', '--porcelain']);
  if (status.trim() && !forceDirty) {
    return {
      ok: false,
      reason: 'dirty_working_tree',
      repoPath,
      changes: status.trim().split('\n').length,
      hint: 'Commit/stash first, or re-run with --force-dirty to stay on current changes.',
    };
  }

  // 5. base branch
  const chosenBase = base || (await _detectBase(repoPath));

  // 6. compute branch name
  const branch = `feature/${key.toLowerCase()}`;

  // check if branch already exists
  let existsLocal = false;
  try {
    await exec('git', ['-C', repoPath, 'rev-parse', '--verify', `refs/heads/${branch}`]);
    existsLocal = true;
  } catch {}

  if (existsLocal) {
    await exec('git', ['-C', repoPath, 'switch', branch]);
    return {
      ok: true,
      action: 'switched',
      repoPath,
      repoName,
      isDb,
      branch,
      base: chosenBase,
      key,
      title,
    };
  }

  // check remote
  let existsRemote = false;
  try {
    await exec('git', ['-C', repoPath, 'rev-parse', '--verify', `refs/remotes/origin/${branch}`]);
    existsRemote = true;
  } catch {}

  if (existsRemote) {
    await exec('git', ['-C', repoPath, 'switch', '--track', `origin/${branch}`]);
    return {
      ok: true,
      action: 'tracked_remote',
      repoPath,
      repoName,
      isDb,
      branch,
      base: chosenBase,
      key,
      title,
    };
  }

  // create new
  await exec('git', ['-C', repoPath, 'switch', '-c', branch, `origin/${chosenBase}`]);
  return {
    ok: true,
    action: 'created',
    repoPath,
    repoName,
    isDb,
    branch,
    base: chosenBase,
    key,
    title,
  };
}

async function _detectBase(repoPath) {
  // Prefer: main, master, develop, dev
  const candidates = ['main', 'master', 'develop', 'dev'];
  for (const b of candidates) {
    try {
      await exec('git', ['-C', repoPath, 'rev-parse', '--verify', `refs/remotes/origin/${b}`]);
      return b;
    } catch {}
  }
  return 'main'; // best-effort default; command will fail loudly if not present
}

// ─── CLI ──────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const [key, ...rest] = process.argv.slice(2);
  if (!key) {
    console.error('Usage: branch.mjs <RTRCDS-KEY> [--base <branch>] [--force-dirty]');
    process.exit(2);
  }
  const base = rest.find((a, i) => rest[i - 1] === '--base');
  const forceDirty = rest.includes('--force-dirty');
  try {
    const r = await createBranchForSubtask(key, { base, forceDirty });
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.ok ? 0 : 1);
  } catch (err) {
    console.error(`[⚠ NEXUS EVENT] ${err.message}`);
    process.exit(1);
  }
}
