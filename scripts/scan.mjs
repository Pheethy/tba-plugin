#!/usr/bin/env node
// TBA — repo scanner. Walks git-tracked files, reads safe excerpts,
// writes to .tba/cache/scan.json. Uses Scout duck animation when TTY.
//
// Ported from rtr-sdlc/project-artifacts.mjs (MIT, same author). Changes:
//   - No AI call here — Claude Code command drives generation
//   - Writes cache JSON + .tba/meta.json; project-map.md stays user-driven
//   - Scout animation integrated for progress feedback
//
// CLI:
//   node scan.mjs                       # scan CWD, write .tba/cache/
//   node scan.mjs /abs/path/to/repo     # scan given repo
//   node scan.mjs --multi /abs/path     # scan all child repos under path
//   node scan.mjs --json                # print result JSON to stdout, no cache write

import { execFile } from 'node:child_process';
import { mkdir, readdir, open, writeFile, realpath, lstat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, isAbsolute, join, relative, sep, resolve } from 'node:path';
import { promisify } from 'node:util';
import { Scout } from './ducks.mjs';

const git = promisify(execFile);

const SOURCE_FILE = /\.(go|ts|tsx|js|jsx|py|java|kt|cs|sql|proto|avsc|graphql|rs|rb|php)$/i;
const PROJECT_FILE =
  /(^|\/)(README\.md|go\.mod|package\.json|pom\.xml|[^/]+\.csproj|openapi\.(yaml|yml|json)|asyncapi\.(yaml|yml|json)|Dockerfile|docker-compose\.ya?ml|[^/]+\.proto)$/i;
const EXCLUDED =
  /(^|\/)(\.[^/]+|node_modules|vendor|dist|build|coverage|secrets?|credentials?|fixtures?)(\/|$)|(^|\/)[^/]*(secret|credential|password|private[-_.]?key|token)[^/]*$/i;

export async function scanRepo(root, { scout = null, maxFiles = 120, maxBytes = 10000 } = {}) {
  const absRoot = resolve(root);
  const repository = basename(absRoot);
  scout?.say(`Sweeping ${repository}...`);
  scout?.mark(repository, 'scanning');

  let stdout;
  try {
    ({ stdout } = await git('git', ['-C', absRoot, 'ls-files', '-z', '--cached'], {
      timeout: 5000,
      maxBuffer: 2_000_000,
    }));
  } catch (err) {
    scout?.mark(repository, 'error');
    throw new Error(`Cannot list tracked files in ${absRoot}: ${err.message}`);
  }

  const candidates = [...new Set(stdout.split('\0'))]
    .filter((f) => f && !EXCLUDED.test(f) && (PROJECT_FILE.test(f) || SOURCE_FILE.test(f)))
    .sort((a, b) => _score(b) - _score(a) || a.localeCompare(b));

  const excerpts = [];
  let remaining = maxBytes;
  let processed = 0;

  for (const file of candidates.slice(0, maxFiles)) {
    if (remaining <= 0) break;
    processed++;
    scout?.tick({ file: `${repository}/${file}`, done: processed, total: Math.min(candidates.length, maxFiles) });

    const target = join(absRoot, file);
    try {
      const resolved = await realpath(target);
      if (relative(absRoot, resolved) !== file.split('/').join(sep) || !(await lstat(target)).isFile()) {
        continue;
      }
      const handle = await open(resolved, 'r');
      try {
        const bytes = Buffer.alloc(Math.min(2200, remaining));
        const { bytesRead } = await handle.read(bytes);
        const excerpt = bytes.subarray(0, bytesRead).toString('utf8');
        if (excerpt.includes('\0')) continue; // binary
        excerpts.push({ file, excerpt });
        remaining -= bytesRead;
      } finally {
        await handle.close();
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        // continue — don't fail whole scan on one file
      }
    }
  }

  scout?.mark(repository, 'done');
  return {
    repository,
    root: absRoot,
    files: candidates.slice(0, maxFiles),
    candidateCount: candidates.length,
    excerpts,
    scannedAt: new Date().toISOString(),
  };
}

export async function findChildRepos(parent, max = 8) {
  const absParent = resolve(parent);
  const children = await readdir(absParent, { withFileTypes: true });
  const roots = [];
  for (const c of children) {
    if (!c.isDirectory() || EXCLUDED.test(c.name)) continue;
    const candidate = join(absParent, c.name);
    if (await _isRepoRoot(candidate)) {
      roots.push(candidate);
      if (roots.length >= max) break;
    }
  }
  return roots.sort();
}

async function _isRepoRoot(path) {
  try {
    const { stdout } = await git('git', ['-C', path, 'rev-parse', '--show-toplevel'], { timeout: 5000 });
    return (await realpath(stdout.trimEnd())) === path;
  } catch {
    return false;
  }
}

function _score(file) {
  if (PROJECT_FILE.test(file)) return 3;
  if (/openapi|proto|schema/i.test(file)) return 2;
  if (/route|handler|controller|consumer|producer|migration|main\.|api\./i.test(file)) return 1;
  return 0;
}

export async function writeCache(cacheDir, data) {
  await mkdir(cacheDir, { recursive: true, mode: 0o700 });
  await writeFile(join(cacheDir, 'scan.json'), JSON.stringify(data, null, 2));
}

// ─── CLI ──────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const jsonOnly = args.includes('--json');
  const multi = args.includes('--multi');
  const pathArg = args.find((a) => !a.startsWith('--'));
  const target = pathArg ? resolve(pathArg) : process.cwd();

  const scout = jsonOnly ? null : new Scout();
  scout?.start('Timeline sweep');

  try {
    let repos;
    let effectiveMulti = multi;
    if (multi) {
      repos = await findChildRepos(target);
      if (!repos.length) {
        scout?.stop({ final: `No repos found under ${target}`, ok: false });
        process.exit(1);
      }
    } else {
      const isRepo = await _isRepoRoot(target);
      if (isRepo) {
        repos = [target];
      } else {
        // auto-detect: not a repo? look for child repos (e.g. workspace folder)
        const children = await findChildRepos(target);
        if (children.length) {
          scout?.say(`Not a git repo — found ${children.length} child repos, switching to project scan.`);
          repos = children;
          effectiveMulti = true;
        } else {
          scout?.stop({ final: `Not a git repo and no child repos found: ${target}`, ok: false });
          process.exit(1);
        }
      }
    }

    scout?.say(`Dispatching agent to ${repos.length} ${repos.length === 1 ? 'repo' : 'repos'}.`);

    const results = [];
    for (const r of repos) {
      const snap = await scanRepo(r, { scout });
      results.push(snap);
    }

    const payload = {
      scope: effectiveMulti ? 'project' : 'repo',
      scannedAt: new Date().toISOString(),
      repos: results.map((r) => ({
        repository: r.repository,
        root: r.root,
        candidateCount: r.candidateCount,
        fileCount: r.files.length,
        excerptBytes: r.excerpts.reduce((sum, e) => sum + Buffer.byteLength(e.excerpt), 0),
      })),
      detail: results,
    };

    if (jsonOnly) {
      process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
      process.exit(0);
    }

    const cacheDir = join(effectiveMulti ? target : repos[0], '.tba', 'cache');
    await writeCache(cacheDir, payload);

    await scout.stop({
      final: `${results.length} repo(s), ${payload.repos.reduce((s, r) => s + r.candidateCount, 0)} files indexed → ${relative(process.cwd(), join(cacheDir, 'scan.json'))}`,
    });
  } catch (err) {
    scout?.stop({ final: err.message, ok: false }).catch(() => {});
    console.error(`[⚠ NEXUS EVENT] ${err.message}`);
    process.exit(1);
  }
}
