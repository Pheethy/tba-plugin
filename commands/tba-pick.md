---
description: TBA — list Jira cards assigned to me (open RTRCDS variants)
---

# /tba:pick

แสดง list การ์ด RTRCDS ที่ assign ให้ Agent (ไม่เอาที่ Done)

## Steps

1. Run:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/jira.mjs pick
   ```

2. ถ้า exit != 0 → print error + bail (ขอให้ user run `/tba:brief` ก่อน)

3. Reformat output ให้อ่านง่าย — ตัวอย่าง:

   ```
   ╭─ ACTIVE VARIANTS — assigned to you ────────────╮
     RTRCDS-2695   In Progress    [FE] Login page redesign
     RTRCDS-2747   Refined        [BE] Add rate limit middleware
     RTRCDS-2812   To Do          [Main] Export report to Excel
   ╰─────────────────────────────────────────────────╯

   Next: /tba:case <KEY> to open a variant.
   ```

4. ถ้าว่าง → "No active variants. The Sacred Timeline is quiet. 🦆"

## Notes

- อย่าเสียเวลาเรียก animation สำหรับ `pick` — มันเร็ว
- ถ้ามี >10 cards → แสดง 10 อันแรก + บรรทัด `(+ N more — raise limit with --all)` *(--all ยังไม่ implement v1, แต่โชว์ไว้ได้)*
