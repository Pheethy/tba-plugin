```
╔════════════════════════════════════════════════╗
║  T · B · A   ThaiBev Agents                    ║
║  Timeline Build Authority                      ║
║  "For All Time. Always Deliver."               ║
╚════════════════════════════════════════════════╝
```

# tba-plugin

Claude Code plugin ช่วยทีม ThaiBev ทำ SDLC loop ครบวงจร — ตั้งแต่หยิบ Jira card → design → implement → ship

> Riff on **TVA** from Marvel's Loki. Keep the Sacred Timeline. Prune unnecessary variants.

## Install

ใน Claude Code:

```
/plugin marketplace add Pheethy/tba-plugin
/plugin install tba@tba-plugin
```

แล้ว:

```
/tba:brief
```

> Command prefix คือ `/tba:` ไม่ใช่ `/tba-` (Claude Code namespaces commands)

## Commands

### Plan Phase
| Command | ทำอะไร |
|---|---|
| `/tba:brief` | splash + status + first-time setup wizard |
| `/tba:pick` | list การ์ด RTRCDS ที่ assign ให้ Agent |
| `/tba:case <KEY>` | เปิดการ์ด + Acceptance Criteria + subtasks |
| `/tba:scan [path]` | Timeline Sweep — scan repo → `.tba/cache/` + duck animation 🦆 |
| `/tba:docs <sub>` | manage hc-my-career-docs (init/pull/scan/publish) |
| `/tba:design <KEY>` | Pre-Build Trial — Q&A planning → `.tba/trials/<KEY>/plan.md` |
| `/tba:post <KEY>` | post design → Jira comment |
| `/tba:subtask <KEY>` | draft `[REPO-NAME]` subtasks → confirm → create |

### Build Phase
| Command | ทำอะไร |
|---|---|
| `/tba:branch <KEY>` | parse `[REPO-NAME]` → cd + git checkout -b `feature/rtrcds-<id>` |
| `/tba:implement <KEY>` | load context → code + unit tests บน branch ปัจจุบัน |
| `/tba:e2e <KEY>` | gen Playwright test ใน `hc-my-career-web/e2e/playwright/sprint{N}/{KEY}/` |

### Handoff Phase
| Command | ทำอะไร |
|---|---|
| `/tba:ship <KEY> [--main] [--all-subtasks]` | transition → READY TO TEST |

## Subtask Naming Convention

```
RTRCDS-1234  [Main] Add employee career path feature
├── [HC-MY-CAREER-API-EMPLOYEE]    Create career path API
├── [HC-MY-CAREER-API-EMPLOYEE-DB] Add career_path table
├── [HC-MY-CAREER-API-PLANNING]    Expose path to planner
└── [HC-MY-CAREER-WEB]             Render career path page
```

TBA parse `[REPO-NAME]` → map ตรงกับ folder ใน workspace
`-DB` suffix → routes กลับ API repo เดียวกัน (migration อยู่คู่กับ API)

## Jira Workflow

```
Refined → To Do → In Progress → READY TO TEST → Closed / Done
                   ↑                   ↑
             /tba:branch         /tba:ship
```

## File Layout (per repo)

```
<repo>/
├── .tba/                        # local, add to global gitignore
│   ├── cache/scan.json          # last scan excerpts
│   ├── project-map.md           # composed overview
│   ├── meta.json                # agent, timestamp
│   └── trials/<KEY>/
│       ├── plan.md              # design draft (post to Jira w/ /tba:post)
│       └── context.json         # snapshot of card at time of trial
```

Add `.tba/` to `~/.gitignore_global`:
```bash
echo '.tba/' >> ~/.gitignore_global
git config --global core.excludesfile ~/.gitignore_global
```

## Typical Day

```bash
/tba:docs pull                   # sync shared architecture context
/tba:pick                        # see my active variants

/tba:case RTRCDS-1234            # open the case
/tba:design RTRCDS-1234          # Q&A trial → plan.md draft
/tba:post RTRCDS-1234            # post plan → Jira
/tba:subtask RTRCDS-1234         # draft + create subtasks

/tba:branch RTRCDS-1235          # start a subtask
/tba:implement RTRCDS-1235       # code + tests
# (manually: git commit, git push)
/tba:e2e RTRCDS-1235             # generate E2E if applicable
/tba:ship RTRCDS-1235            # submit for audit

# When all subtasks done:
/tba:ship RTRCDS-1234 --main     # main card → READY TO TEST → handoff QA
```

## Configuration

Config stored at `~/.tba/config.json` (mode 600). Shape:

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

Get a Jira API token at https://id.atlassian.com/manage-profile/security/api-tokens

## License

MIT
