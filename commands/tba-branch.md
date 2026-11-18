---
description: TBA — create feature branch for a Jira subtask (parses [REPO-NAME], cd to correct repo, git checkout -b feature/rtrcds-<id>)
---

# /tba:branch <SUBTASK-KEY>

ตัดสาขา **feature/rtrcds-&lt;id&gt;** ใน repo ที่ถูกต้องตาม `[REPO-NAME]` prefix ของ subtask

## Args
- `<SUBTASK-KEY>` — Jira subtask key (e.g. `RTRCDS-1235`)
- `--base <branch>` (optional) — override base branch (default: auto-detect main/master/develop)
- `--force-dirty` (optional) — ยอมให้มี uncommitted changes ติดไป (default: abort ถ้า dirty)

## Steps

1. Run:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/branch.mjs <KEY> [--base <b>] [--force-dirty]
   ```
   Returns JSON: `{ ok, action, repoPath, repoName, isDb, branch, base, key, title }`

2. **On success** (`ok: true`):
   ```
   [◉ BRANCH <action>]
     Repo:    hc-my-career-api-employee  (/abs/path)
     Branch:  feature/rtrcds-1235
     Base:    main
     Subtask: RTRCDS-1235 — Create career path API

   Next:
     cd <repoPath>
     /tba:implement <KEY>     → start implementation
   ```

   `action` จะเป็น `created` / `switched` / `tracked_remote` — บอก user ให้ตรงๆ

3. **On failure** — handle แต่ละ reason:

   - `repo_not_found` → ชี้ให้ user แก้ subtask title (แสดง suggestions)
   - `fetch_failed` → แสดง error (ปกติเป็น network/auth); แนะนำเช็ค SSH key หรือ VPN
   - `dirty_working_tree` → แสดง changes count + hint ให้ `git stash` หรือ commit ก่อน

4. (Optional) **transition subtask to "In Progress"** ถ้า current status = "To Do" / "Refined":
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/jira.mjs transition <KEY> "In Progress"
   ```
   ถามก่อน: `"จะเปลี่ยน status เป็น In Progress ให้ไหม? (y/n)"`

## Rules

- **อย่า push branch** — ให้ dev push เองเมื่อพร้อม
- **ไม่ลบ branch เก่า** — ถ้ามี branch ชื่อซ้ำ → switch ไป (ไม่สร้างใหม่)
- **Repo mapping ต้อง resolve ได้** — ถ้า subtask title ไม่มี `[REPO-NAME]` → abort + แนะนำให้ user แก้ title ใน Jira ก่อน (แล้วค่อยรันใหม่)
- **DB subtask** — `isDb: true` จะ branch ใน API repo เดียวกัน (DB migration อยู่กับ API) — แจ้ง user ว่า "branch นี้สำหรับ migration — ไฟล์ migration อยู่ที่ `<convention path>` เช่น `db/migrations/`"

## Theme

- Stamp success: `[◉ BRANCH CREATED]` / `[◉ BRANCH SWITCHED]` / `[◉ TRACKING REMOTE]`
- Stamp fail: `[⚠ NEXUS EVENT]`
- Dialog (ถ้าใช้ duck): *"Dispatching agent to <repo>."*
