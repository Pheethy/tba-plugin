---
description: TBA — post a design / plan / note as a Jira comment on a RTRCDS card
---

# /tba:post <KEY>

ยิง comment เข้า Jira card ทันที (ไม่ต้องขอ confirm ตาม rule: Jira comments = direct post)

## Args
- `<KEY>` — Jira issue key
- Body: จาก stdin / จาก `.tba/trials/<KEY>/plan.md` / หรือ user พิมพ์ในแชต

## Steps

1. Validate key

2. Resolve body source (priority order):
   - (a) ถ้า user พิมพ์ body ตามหลัง command → ใช้ตรง ๆ
   - (b) ถ้า `.tba/trials/<KEY>/plan.md` exists → ใช้ไฟล์นั้น
   - (c) ไม่งั้น → ask user "Paste design here (end with EOF line):"

3. Preview to user:
   ```
   ── Preview ─────────────────────────────────────
   <first 500 chars>
   ...
   ── End preview ────────────────────────────────

   Posting to RTRCDS-1234...
   ```

4. Post via stdin pipe:
   ```bash
   printf '%s' "<BODY>" | node ${CLAUDE_PLUGIN_ROOT}/scripts/jira.mjs comment <KEY> --stdin
   ```

5. On success → stamp:
   ```
   [✓ COMMENT POSTED] RTRCDS-1234 (id=<comment-id>)
   View: https://digital-and-technology.atlassian.net/browse/<KEY>
   ```

6. On error → stamp `[⚠ NEXUS EVENT]` + show message.

## Notes

- ADF conversion เป็นแบบ minimal — รองรับ paragraph + code fence. Markdown headings / lists จะมาเป็น plain text ใน Jira UI (ยังอ่านออกได้)
- Comment post ไปแล้ว **แก้ไม่ได้ผ่าน TBA** ต้องไปแก้ใน Jira UI เอง
- ไม่ confirm ก่อน post — ตาม design decision ของทีม (step 1 = ยิงเลย)
