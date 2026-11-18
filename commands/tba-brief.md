---
description: TBA splash + agent status + first-time setup wizard
---

# /tba:brief

แสดง splash ของ Timeline Build Authority + สถานะปัจจุบันของ Agent + ถ้ายังไม่มี config → run setup wizard

## Steps

**1. Load config**
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs show 2>/dev/null
```
- exit 0 → มี config → ไป step 2
- exit != 0 → ไป step 4 (setup wizard)

**2. Verify Jira connection**
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/jira.mjs ping
```
Capture result. Success stamp: `[◉ CLEARED FOR DUTY]`. Failure stamp: `[⚠ CREDENTIALS REJECTED]`.

**3. Render brief block** — print this verbatim (keep emoji + spacing):

```
╔════════════════════════════════════════════════╗
║  T · B · A   ThaiBev Agents                    ║
║  Timeline Build Authority                      ║
║  "For All Time. Always Deliver."               ║
╚════════════════════════════════════════════════╝

  Agent:            <displayName> <email>
  Sacred Backlog:   <project>  [◉ CLEARED FOR DUTY]
  Workspace:        <workspace.root>
  Docs:             <docs.localPath>  (<exists? ✓ : ⚠ missing>)
  Timeline:         NOMINAL

  Next: /tba:pick to open the case queue.
```

End of command. Do NOT run anything further.

---

## 4. Setup wizard (first-time only)

ถ้า config ไม่มี → ถาม user ที่ละข้อ (**ถามทีละข้อ รอคำตอบก่อนถามข้อถัดไป**). เมื่อได้ครบ → เขียน `~/.tba/config.json`.

### 4.1 บอก user ว่าต้องทำอะไรก่อน

Print:
```
[⚠ NEW AGENT DETECTED]
Welcome to the Time Variance... er, Timeline Build Authority.

เพื่อเริ่มใช้งาน ต้องเตรียม 3 อย่าง:
  1. Jira email     — อีเมล Atlassian ของคุณ
  2. Jira API token — สร้างที่ https://id.atlassian.com/manage-profile/security/api-tokens
  3. Workspace path — folder ที่มี hc-my-career-* repos อยู่

กดเริ่มได้เลยเมื่อพร้อม.
```

### 4.2 Ask questions

Ask ONE at a time. Use plain Thai questions:

1. "Jira email ของคุณคืออะไร?"
2. "Paste Jira API token (จะเก็บที่ `~/.tba/config.json` permission 600):"
3. "Workspace root? (default: `~/go/src/gitlab.thaibevapp.com/my-career` — กด Enter เพื่อใช้ default)"
4. "Docs folder? (default: `<workspace>/hc-my-career-docs`)"

### 4.3 Build config object

Start from defaults:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs defaults
```

Override with user answers. Write via a short inline node script:

```bash
cat > /tmp/tba-setup.mjs <<'EOF'
import { saveConfig, DEFAULTS } from '~/.claude/plugins/.../scripts/config.mjs';
// ^^ note: use ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs path dynamically
const cfg = {
  ...DEFAULTS,
  jira: { ...DEFAULTS.jira, email: '<EMAIL>', token: '<TOKEN>' },
  workspace: { ...DEFAULTS.workspace, root: '<ROOT>' },
  docs: { localPath: '<DOCS>' },
};
await saveConfig(cfg);
console.log('[✓] Config saved.');
EOF
node /tmp/tba-setup.mjs
```

Easier: directly write JSON file with `jq` or via a Bash heredoc that constructs the JSON — your call based on what shows cleanest.

### 4.4 Verify + welcome

After saving, run step 2 (ping). On success:
```
[◉ CLEARED FOR DUTY] <displayName>

Agent registered. Sacred Timeline nominal.
Try: /tba:pick
```

On failure:
```
[⚠ CREDENTIALS REJECTED]
<error message>

Check token at https://id.atlassian.com/manage-profile/security/api-tokens
Re-run /tba:brief to try again.
```

---

## Theme reminders

- **No duck animation here** — brief feels like a bulletin, not a parade
- Stamps always English for grep: `[◉ CLEARED FOR DUTY]`, `[⚠ CREDENTIALS REJECTED]`, `[⚠ NEW AGENT DETECTED]`
- Thai narration OK and encouraged for human-facing lines
- Never echo the token back to the user after they paste it
- If step 2 succeeds → ALWAYS end with "Next: /tba:pick ..."
