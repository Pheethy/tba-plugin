---
description: TBA — open a Jira card (RTRCDS variant), show summary + AC + subtasks
---

# /tba:case <KEY>

## Args
- `<KEY>` — Jira issue key เช่น `RTRCDS-1234`. ถ้าไม่ระบุ → prompt user

## Steps

1. Validate key format: `/^RTRCDS-\d+$/i` (uppercase it)

2. Run:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/jira.mjs case <KEY>
   ```
   Returns JSON with `{key, summary, description, status, type, priority, assignee, reporter, parent, subtasks, labels, sprintField}`

3. Pretty print to user:

   ```
   ╭─ VARIANT FILE ──────────────────────────────────╮
     Key:         RTRCDS-1234
     Status:      In Progress
     Type:        Story      Priority: Medium
     Assignee:    <name>     Reporter: <name>
     Parent:      <KEY or ->
   ╰─────────────────────────────────────────────────╯

   Summary:
     <summary>

   ── Sacred Timeline (Description) ──
   <description markdown>

   ── Subtasks ──
     RTRCDS-1235  [To Do]         [HC-MY-CAREER-WEB] Render login page
     RTRCDS-1236  [In Progress]   [HC-MY-CAREER-API-EMPLOYEE] Login API

   Next:
     /tba:design <KEY>    → start pre-build trial
     /tba:subtask <KEY>   → draft + create subtasks
     /tba:post <KEY>      → post design to this card
   ```

4. ถ้า key ไม่พบ → stamp `[⚠ VARIANT NOT FOUND]` + suggest `/tba:pick` ดู list

## Notes

- Description เป็น markdown-ish (converted from ADF). บางครั้ง formatting อาจไม่ร้อยเปอร์เซ็นต์ — เป็นปกติของ ADF→MD conversion
- ถ้า subtask มี tag `[REPO-NAME]` → mark ด้วย ⚡ ว่า parseable, หรือ 🚧 ถ้าไม่มี tag (เพื่อเตือนให้แก้ title ก่อน `/tba:branch` ได้)
