#!/usr/bin/env node
// TBA config loader / saver. Lives at ~/.tba/config.json

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

export const CONFIG_DIR = path.join(homedir(), '.tba');
export const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export const DEFAULTS = {
  jira: {
    site: 'digital-and-technology.atlassian.net',
    email: '',
    token: '',
    project: 'RTRCDS',
    transitions: {
      readyToTest: 'READY TO TEST',
      inProgress: 'In Progress',
    },
  },
  docs: {
    localPath: path.join(
      homedir(),
      'go/src/gitlab.thaibevapp.com/my-career/hc-my-career-docs'
    ),
  },
  workspace: {
    root: path.join(homedir(), 'go/src/gitlab.thaibevapp.com/my-career'),
    repoPrefix: 'hc-my-career-',
  },
  e2e: {
    repo: 'hc-my-career-web',
    pathPattern: 'e2e/playwright/sprint{N}/{KEY}',
  },
};

export function configExists() {
  return existsSync(CONFIG_PATH);
}

export async function loadConfig() {
  if (!configExists()) return null;
  const raw = await readFile(CONFIG_PATH, 'utf8');
  return JSON.parse(raw);
}

export async function saveConfig(config) {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
  return CONFIG_PATH;
}

// CLI: node config.mjs show | init | path
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2] || 'show';
  if (cmd === 'show') {
    const c = await loadConfig();
    if (!c) {
      console.log('No config yet. Run `/tba-brief` for setup wizard.');
      process.exit(1);
    }
    const redacted = JSON.parse(JSON.stringify(c));
    if (redacted.jira?.token) redacted.jira.token = '***';
    console.log(JSON.stringify(redacted, null, 2));
  } else if (cmd === 'init') {
    if (configExists()) {
      console.log(`Config already exists at ${CONFIG_PATH}`);
      process.exit(0);
    }
    const p = await saveConfig(DEFAULTS);
    console.log(`Wrote default config to ${p}`);
    console.log('Edit it to add your Jira email + token.');
  } else if (cmd === 'path') {
    console.log(CONFIG_PATH);
  } else if (cmd === 'defaults') {
    console.log(JSON.stringify(DEFAULTS, null, 2));
  } else {
    console.log('Usage: node config.mjs [show|init|path|defaults]');
  }
}
