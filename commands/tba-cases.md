---
description: TBA — list all open cases in this repo (CWD-scoped). Shows phase + last update.
---

# /tba:cases

List **all cases** ที่มีอยู่ใน `.tba/cases/` ของ CWD

## Steps

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/case-state.mjs list
```

## Output

```
╭─ ALL CASES in <CWD> ────────────────────────────╮
  ● RTRCDS-1234  build       [Main] Add employee career path    (updated 2h ago)
    RTRCDS-1189  closed      [FE] Login redesign                 (3d ago)
    RTRCDS-1156  trial       [Main] Export report to Excel       (5d ago)
    RTRCDS-1023  closed      [BE] Health check endpoint          (2w ago)
╰──────────────────────────────────────────────────╯

● = active case

Actions:
  /tba:resume <KEY>     → switch active + show next action
  /tba:flow <KEY>       → resume auto flow for a case
  rm -rf .tba/cases/<KEY>  → delete a case (manual)
```

## Notes

- Sorted by `updatedAt` desc
- Phase glyphs:
  - `intake` → 🦆
  - `trial` → 🔮
  - `build` → ⚙️
  - `ship` → 🔍
  - `closed` → ✓
- ไม่ลบ case อัตโนมัติ — dev manage ตามใจ
