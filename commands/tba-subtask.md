---
description: TBA — draft [REPO-NAME] subtasks, confirm with user, create in Jira
---

# /tba:subtask <KEY>

Draft list ของ subtask ตาม pattern `[REPO-NAME] title`, ให้ user confirm, แล้ว **TBA สร้างให้ผ่าน API** (ตาม design decision step 2 = (b))

## Args
- `<KEY>` — parent Jira card key (e.g. RTRCDS-1234)

## Steps

1. Load parent card:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/jira.mjs case <KEY>
   ```

2. Analyze description + existing subtasks. Draft a proposed list using these naming rules:

   **Naming pattern:** `[REPO-NAME] <imperative verb> <noun>`

   Valid repos (ดูจาก workspace):
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/repo-map.mjs list
   ```

   Common split ที่ใช้ใน hc-my-career:
   - `[HC-MY-CAREER-API-EMPLOYEE]` — employee-facing APIs
   - `[HC-MY-CAREER-API-PLANNING]` — planner-side APIs
   - `[HC-MY-CAREER-API-REPORT]` — reporting
   - `[HC-MY-CAREER-API-SYNC-MASTER-DATA]` — master data sync
   - `[HC-MY-CAREER-AI-EMPLOYEE]` — AI features
   - `[HC-MY-CAREER-CRON-JOBS]` — scheduled jobs
   - `[HC-MY-CAREER-WEB]` — frontend
   - `[HC-MY-CAREER-<API>-DB]` — DB migration lives with its API repo

3. Verify each proposed tag via `repo-map.mjs` → warn ถ้า tag ไม่ match repo จริง

4. Present draft to user:
   ```
   ╭─ PROPOSED SUBTASKS for RTRCDS-1234 ─────────────╮
     1. [HC-MY-CAREER-API-EMPLOYEE]    Create career path API
     2. [HC-MY-CAREER-API-EMPLOYEE-DB] Add career_path table migration
     3. [HC-MY-CAREER-WEB]             Render career path page
   ╰──────────────────────────────────────────────────╯

   ✅ All tags resolve to existing repos.

   Confirm? (y = create all / n = cancel / e = edit list)
   ```

5. **On `y`** → create each via:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/jira.mjs subtask <KEY> "<summary>"
   ```
   Collect created keys. Show:
   ```
   [✓ SUBTASKS CREATED]
     RTRCDS-1240  [HC-MY-CAREER-API-EMPLOYEE]    Create career path API
     RTRCDS-1241  [HC-MY-CAREER-API-EMPLOYEE-DB] Add career_path table migration
     RTRCDS-1242  [HC-MY-CAREER-WEB]             Render career path page

   Next: (v2) /tba:branch <SUBTASK-KEY> to start implementation
   ```

6. **On `n`** → "Pruned. No subtasks created."

7. **On `e`** → ask user to paste edited list (same format: `[REPO-NAME] title` one per line) → loop back to step 3

## Notes

- **Never create without confirm** (rule from design doc)
- If any tag doesn't resolve → show ⚠ next to it + list suggestions from `repo-map.mjs` → ask user to fix before confirming
- DB migration ไม่มี repo แยก — ใช้ `-DB` suffix บน API repo ของมัน (e.g. `[HC-MY-CAREER-API-EMPLOYEE-DB]`)
- ถ้าการ์ดมี subtask อยู่แล้ว → แสดงเทียบให้เห็นว่าอันไหนซ้ำ อันไหนใหม่ → user ตัดสินใจเองว่าจะสร้างซ้ำไหม
