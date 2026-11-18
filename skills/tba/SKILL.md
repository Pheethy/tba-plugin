---
name: tba
description: ThaiBev Agents (TBA) — SDLC workflow plugin themed as "Timeline Build Authority". Use when the user wants to pick a Jira card from RTRCDS, design a feature, post design to Jira, create subtasks, or work on hc-my-career services.
---

# TBA — Timeline Build Authority

หน่วยงานควบคุมเส้นเวลาของทุก sprint ที่ ThaiBev
Theme: Marvel's TVA (Loki). Retro-futurism bureaucracy + Thai-English mix.
Mascot: **แก๊งเป็ด field agent** 🦆 (ตัวเดียวพูด, ตัวอื่นแสดง animation)

Tagline: *"For All Time. Always Deliver."*

## When to invoke

ผู้ใช้พิมพ์ `/tba-*` ใด ๆ ก็ตาม หรือพูดถึง:
- RTRCDS card / Jira ที่ `digital-and-technology.atlassian.net`
- hc-my-career services (7 repos: api-employee, api-planning, api-report, api-sync-master-data, ai-employee, cron-jobs, web)
- design a feature end-to-end
- create Jira subtask
- post plan/QA to Jira

## Terminology (TVA flavor — use in NARRATION, not in file/command names)

| Concept | TBA term |
|---|---|
| Jira Card | **Variant** |
| Acceptance Criteria | **Sacred Timeline** |
| RTRCDS project | **Sacred Backlog** |
| Repo scan | **Timeline Sweep** |
| Design planning | **Pre-Build Trial** |
| QA scenarios | **Audit Protocol** |
| Transition to READY TO TEST | **Submit for Audit** |
| User | **Agent** |
| Claude Code | **TemPad** |

Stamp badges สำหรับ output:
- `[◉ APPROVED FOR BUILD]` — planning passed
- `[⚠ NEXUS EVENT]` — missing info / conflict
- `[✂ VARIANT PRUNED]` — cancelled
- `[◎ AUDIT COMPLETE]` — QA drafted
- `[⌛ TIMELINE SWEEP]` — scan in progress
- `[✓ SUBMITTED]` — transition succeeded

## Config

Location: `~/.tba/config.json`

Schema:
```json
{
  "jira": {
    "site": "digital-and-technology.atlassian.net",
    "email": "...",
    "token": "...",
    "project": "RTRCDS",
    "transitions": {
      "readyToTest": "READY TO TEST",
      "inProgress": "In Progress"
    }
  },
  "docs": { "localPath": "..." },
  "workspace": {
    "root": "~/go/src/gitlab.thaibevapp.com/my-career",
    "repoPrefix": "hc-my-career-"
  },
  "e2e": {
    "repo": "hc-my-career-web",
    "pathPattern": "e2e/playwright/sprint{N}/{KEY}"
  }
}
```

## File layout per repo

```
<repo>/
├── .tba/                        # local, gitignored
│   ├── cache/                   # scan output (regeneratable)
│   ├── meta.json
│   └── trials/<KEY>/            # drafts (plan.md, qa.md)
```

## Subtask naming (strict)

```
[REPO-NAME-UPPERCASE] Human readable title
```

Example:
- `[HC-MY-CAREER-API-EMPLOYEE] Create career path API`
- `[HC-MY-CAREER-API-EMPLOYEE-DB] Add career_path table`
- `[HC-MY-CAREER-WEB] Render career path page`

TBA maps `[HC-MY-CAREER-API-EMPLOYEE]` → `<workspace>/hc-my-career-api-employee`
DB tag: append `-DB` → same repo as its API counterpart.

## Scripts

All helpers in `scripts/`:
- `ducks.mjs` — animated duck row for long-running ops
- `jira.mjs` — Jira REST v3 client (read + write)
- `config.mjs` — load/save `~/.tba/config.json`
- `scan.mjs` — repo scan → `.tba/cache/`
- `repo-map.mjs` — parse `[REPO-NAME]` tag → absolute repo path

Invoke via `node <plugin-root>/scripts/<name>.mjs ...` using Bash tool.

## Rules of engagement

1. **Never post to Jira without user confirm for subtasks** (step 2 = `b` in design doc)
2. **Jira comments (step 4)**: post directly, no confirm needed
3. **Branch pattern**: `feature/rtrcds-<id-lower>` (not `RTRCDS-1234`)
4. **E2E path**: `<fe-repo>/e2e/playwright/sprint<N>/<SUBTASK-KEY>/*.spec.ts`
5. **Keep animation only on TTY** — pipe/redirect falls back to plain log
6. **Never leak secrets** — scan skips files matching `.env`, `*.key`, `credentials.*`, etc.
7. **Thai + English mix** in user-facing text is encouraged; stamp badges always English for grep-ability
