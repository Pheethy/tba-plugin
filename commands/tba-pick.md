---
description: TBA — list Jira cards assigned to me in the current (open) sprint, including DONE for review
---

# /tba:pick

แสดง list การ์ด RTRCDS ที่ assign ให้ Agent **ใน sprint ปัจจุบัน** — รวม **DONE** ด้วยเพื่อให้ Agent ตรวจงานที่ปิดไปแล้วได้ (QA follow-up, revisit merged subtask, etc.)

## Scope

JQL ที่ใช้:
```
project = RTRCDS
AND assignee = currentUser()
AND sprint in openSprints()
ORDER BY status ASC, updated DESC
```

- **sprint**: `openSprints()` = sprint ที่ยัง active (ปกติมีเดียว)
- **status**: ทุก status รวม Done/Closed (ไม่ filter ออก)
- **sort**: status จาก To Do → In Progress → Done → ปิดท้าย

## Steps

1. Run:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/jira.mjs pick
   ```

2. ถ้า exit != 0 → print error + bail (ขอให้ user run `/tba:brief` ก่อน)

3. Reformat output ให้อ่านง่าย **group ตาม status**:

   ```
   ╭─ VARIANTS — Sprint 16 (<N> cards assigned to you) ──╮

   ▸ IN PROGRESS
     RTRCDS-2695   [FE] Login page redesign
     RTRCDS-2747   [BE] Add rate limit middleware

   ○ TO DO / REFINED
     RTRCDS-2812   [Main] Export report to Excel

   ✓ READY TO TEST
     RTRCDS-2701   [BE] Fix duplicate submit guard

   ✓ DONE / CLOSED
     RTRCDS-2654   [FE] Profile avatar upload
     RTRCDS-2623   [BE] Health check endpoint

   ╰──────────────────────────────────────────────────────╯

   Next:
     /tba:case <KEY>    → open any variant
     /tba:ship <KEY>    → push "In Progress" → READY TO TEST
   ```

4. ถ้าว่าง → "No cards in current sprint. The Sacred Timeline is quiet. 🦆"

## Notes

- **DONE cards โชว์ด้วย** — ตั้งใจให้ Agent review งานเก่าได้ (เช่น QA เจอบั๊ก → reopen; ตรวจ merged work)
- Sprint detection ใช้ `openSprints()` ซึ่งอาจมีหลายอันถ้าทีมเปิดหลาย sprint ขนาน — JQL จะเอามาทั้งหมด (พบน้อย)
- ถ้า cards > 50 → แค่ 50 อันแรก (sort by status → updated DESC) — ไม่น่าถึง quota ปกติ
- ไม่มี duck animation — `pick` ต้องเร็ว
