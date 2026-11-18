```
╔════════════════════════════════════════════════╗
║  T · B · A   ThaiBev Agents                    ║
║  Timeline Build Authority                      ║
║  "For All Time. Always Deliver."               ║
╚════════════════════════════════════════════════╝
```

# tba-plugin

Claude Code plugin ช่วยทีม ThaiBev ทำ SDLC loop แบบครบวงจร — ตั้งแต่หยิบ Jira card, design, implement, ไป ship

> Riff on **TVA** from Marvel's Loki. Keep the Sacred Timeline. Prune unnecessary variants.

## สิ่งที่ได้

- **Pick** — ดึง Jira card (RTRCDS) ที่ assign ให้คุณ
- **Scan** — scan repo + docs เพื่อเตรียม context (พร้อมฝูงเป็ด 🦆)
- **Design** — Q&A วางแผน (API blueprint, ER diagram, sequence diagram)
- **Post** — ยิง design กลับเข้า Jira comment
- **Subtask** — draft `[REPO-NAME] ...` subtask list → confirm → create ให้
- **Branch / Implement / E2E / Ship** — (v2) เริ่ม build, gen Playwright test, ปลด Jira ไป READY TO TEST

## Commands

| Command | ทำอะไร |
|---|---|
| `/tba-brief` | splash + status + first-time setup |
| `/tba-pick` | list การ์ด assigned to me |
| `/tba-case <KEY>` | เปิดการ์ด + Acceptance Criteria |
| `/tba-scan` | scan repo ปัจจุบัน → `.tba/cache/` |
| `/tba-docs pull/scan` | sync hc-my-career-docs |
| `/tba-design <KEY>` | Q&A planning (ใช้ tb-brainstorming) |
| `/tba-post <KEY>` | post design → Jira comment |
| `/tba-subtask <KEY>` | create subtasks ตาม pattern `[REPO-NAME] title` |

## Install

ใน Claude Code:

```
/plugin marketplace add Pheethy/tba-plugin
/plugin install tba@tba-plugin
```

แล้วรีสตาร์ท Claude Code → เรียกใช้:

```
/tba:brief
```

> หมายเหตุ: command prefix คือ `/tba:` (ไม่ใช่ `/tba-`) เพราะ Claude Code namespace commands ด้วย `<plugin>:<name>`

Setup wizard จะถาม:
- Jira email + API token (digital-and-technology.atlassian.net)
- Workspace root (default: `~/go/src/gitlab.thaibevapp.com/my-career`)
- Docs path (default: `<workspace>/hc-my-career-docs`)

Config ถูกเก็บที่ `~/.tba/config.json`

## Subtask Naming Convention

```
RTRCDS-1234  [Main] Add employee career path feature
├── [HC-MY-CAREER-API-EMPLOYEE] Create career path API
├── [HC-MY-CAREER-API-PLANNING] Expose path to planner
├── [HC-MY-CAREER-WEB] Render career path page
└── [HC-MY-CAREER-API-EMPLOYEE-DB] Add career_path table
```

TBA parse `[REPO-NAME]` → map ตรงกับ repo ใน workspace

## Jira Workflow

```
Refined → To Do → In Progress → READY TO TEST → Closed / Done
```

## License

MIT
