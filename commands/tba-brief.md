---
description: TBA splash + agent status + first-time setup wizard
---

# /tba-brief

แสดง splash ของ Timeline Build Authority + สถานะปัจจุบันของ Agent + ถ้ายังไม่มี config → เริ่ม setup wizard

## Steps

1. **Check config** — run:
   ```bash
   node ~/.claude/plugins/tba/scripts/config.mjs show 2>/dev/null
   ```
   ถ้า exit != 0 → ไปข้อ 4 (setup)

2. **Render splash** — print block นี้ (คง formatting และ color codes):
   ```
   ╔════════════════════════════════════════════════╗
   ║  T · B · A   ThaiBev Agents                    ║
   ║  Timeline Build Authority                      ║
   ║  "For All Time. Always Deliver."               ║
   ╚════════════════════════════════════════════════╝
   ```

3. **Show status** — read config + show:
   - Agent (Jira email)
   - Sacred Backlog (Jira project)
   - Workspace root
   - Docs path (+ whether exists)
   - Last sweep timestamp (if `.tba/meta.json` exists in CWD)

   Example:
   ```
   Agent:            your.email@company.com
   Sacred Backlog:   RTRCDS  ✓ connected
   Workspace:        ~/go/src/gitlab.thaibevapp.com/my-career
   Docs:             hc-my-career-docs  (local only, not yet git repo)
   Timeline:         NOMINAL
   ```

4. **Setup wizard** (first-time only) — ask user in order:
   - Jira email
   - Jira API token (link to https://id.atlassian.com/manage-profile/security/api-tokens)
   - Workspace root (default: `~/go/src/gitlab.thaibevapp.com/my-career`)
   - Docs folder (default: `<workspace>/hc-my-career-docs`)

   Then write `~/.tba/config.json` using `scripts/config.mjs` as reference for shape. Save with `saveConfig()` from that module (or write JSON directly with the DEFAULTS merged with user answers).

5. **Verify Jira connection** — call `scripts/jira.mjs ping` (TODO: create later) and stamp `[◉ CLEARED FOR DUTY]` on success

## Theme reminders

- Use duck mascot sparingly here (brief should feel like a bulletin, not a parade)
- Stamps: `[◉ CLEARED FOR DUTY]`, `[⚠ CREDENTIALS MISSING]`
- Always end with: `Use /tba-pick to open the case queue.`
