---
description: TBA — Submit for Audit. Transition a Jira issue to READY TO TEST.
---

# /tba:ship <KEY> [--main] [--all-subtasks]

เปลี่ยน status ของการ์ด Jira → **READY TO TEST** (หรือ transition ที่ config ไว้)

## Args
- `<KEY>` — Jira issue key
- `--main` — transition main card (parent) แทน subtask
- `--all-subtasks` — เปลี่ยน status ของทุก subtasks ของการ์ดนี้ให้เป็น READY TO TEST (ตามด้วย main ถ้าใส่ `--main` ด้วย)

## Steps

### 1. Load issue
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/jira.mjs case <KEY>
```

### 2. Resolve target transition

จาก config:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs show | jq -r '.jira.transitions.readyToTest'
```
Default: `READY TO TEST`

### 3. Confirm with user

Show preview:
```
╭─ SUBMIT FOR AUDIT ──────────────────────────────╮
  Issue:        RTRCDS-1235
  Current:      In Progress
  Transition:   → READY TO TEST
  Summary:      [HC-MY-CAREER-API-EMPLOYEE] Create career path API
╰──────────────────────────────────────────────────╯

Confirm? (y/n)
```

**ถ้า `--all-subtasks`** → แสดง list ทั้งหมดก่อน confirm:
```
╭─ BATCH SUBMIT ──────────────────────────────────╮
  Parent:       RTRCDS-1234
  Subtasks (3):
    RTRCDS-1235  In Progress    → READY TO TEST
    RTRCDS-1236  In Progress    → READY TO TEST
    RTRCDS-1237  Done           → skip (already done)
  (if --main)
  Main:         RTRCDS-1234     → READY TO TEST
╰──────────────────────────────────────────────────╯

Confirm all? (y/n)
```

### 4. Transition
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/jira.mjs transition <KEY> "READY TO TEST"
```

(สำหรับ batch: loop)

### 5. Report
```
[✓ SUBMITTED] RTRCDS-1235 → READY TO TEST
  View: https://digital-and-technology.atlassian.net/browse/RTRCDS-1235

Agent handoff complete. Next: smoke-test manually, then notify QA.
```

สำหรับ batch:
```
[✓ BATCH SUBMITTED]
  RTRCDS-1235 → READY TO TEST  ✓
  RTRCDS-1236 → READY TO TEST  ✓
  RTRCDS-1237                  (skipped: already Done)
  RTRCDS-1234 → READY TO TEST  ✓   (main)
```

### 6. Post-ship checklist (Thai, in chat)
```
Checklist สำหรับ Agent:
  ☐ smoke test ด้วยตัวเองก่อน (manual run)
  ☐ ถ้า BE service: deploy ไป test env แล้วหรือยัง?
  ☐ แจ้ง QA ให้ test ซ้ำ (post ใน Slack / ping ใน team channel)
  ☐ (optional) ตอบกลับใน Jira ว่า "merged on branch feature/rtrcds-xxxx" พร้อม commit SHA
```

## Rules

- **ต้อง confirm ก่อน transition ทุกครั้ง** — ยกเว้น user flag `--yes` (v2 feature)
- **ถ้า transition ไม่พบ** — show available transitions จาก `jira.mjs transitions <KEY>` + ให้ user เลือกเอง
- **ถ้า issue status เป็น READY TO TEST อยู่แล้ว** — ไม่ error, แค่แจ้ง "already in target status"
- **อย่า push branch ให้** — เป็นหน้าที่ dev
- **อย่า merge PR ให้** — เป็นหน้าที่ reviewer

## Theme

- Dialog: *"Submitting variant for audit."*
- Stamp: `[✓ SUBMITTED]`
- Fail: `[⚠ NEXUS EVENT]` + transition list
