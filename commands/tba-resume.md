---
description: TBA — show the active case + suggest next action. Resume a paused flow.
---

# /tba:resume

แสดง **active case** ปัจจุบัน + **next action** ที่ควรทำ

เรียกได้ทุกเมื่อ (รวมหลังรีสตาร์ท Claude Code) เพื่อจำได้ว่ากำลังทำการ์ดไหน, อยู่ phase อะไร

## Args
- `[KEY]` (optional) — ถ้าระบุ → สลับ active ไปที่การ์ดนั้นก่อน resume

## Steps

### 1. Switch active (ถ้ามี arg)

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/case-state.mjs set-active <KEY>
```

### 2. Load active case

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/case-state.mjs active
node ${CLAUDE_PLUGIN_ROOT}/scripts/case-state.mjs show
```

ถ้าไม่มี active → print:
```
No active case. Open one with:
  /tba:flow <KEY>     → run full orchestration
  /tba:cases          → list all open cases in this repo
```

### 3. Determine next action

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/case-state.mjs next
```

### 4. Print status card

```
╭─ ACTIVE CASE ───────────────────────────────────╮
  Key:       RTRCDS-1234
  Summary:   [Main] Add employee career path
  Phase:     build  (3rd of 7)
  Started:   2 days ago
  Last gate: subtask-create → approved (3 created)

  Subtasks:
    RTRCDS-1235  [HC-MY-CAREER-API-EMPLOYEE]     shipped  ✓
    RTRCDS-1236  [HC-MY-CAREER-API-EMPLOYEE-DB]  audited  ◉
    RTRCDS-1237  [HC-MY-CAREER-WEB]              pending  ·

  Next action: Ship RTRCDS-1236 → READY TO TEST
      /tba:ship RTRCDS-1236        (manual)
      /tba:flow                    (continue auto flow)
╰──────────────────────────────────────────────────╯
```

### 5. Offer to resume

Ask user: `"Continue /tba:flow for this case? (y/n)"`
ถ้า `y` → invoke `/tba:flow <KEY>` (จะ skip phases ที่ทำแล้ว ไป phase ปัจจุบัน)

## Notes

- **CWD-scoped** — active case อยู่ใน `.tba/active` ของ CWD. สลับ repo → active ต่างกัน
- **Multi-case per repo** — มี case หลาย key ใน `.tba/cases/` ได้ แต่ active ได้ 1 ตัว
- **Pause ≠ abort** — paused case ยังอยู่ใน `.tba/cases/`, resume เมื่อไหร่ก็ได้
