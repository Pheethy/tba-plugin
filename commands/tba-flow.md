---
description: TBA — Orchestrator. Pick/open a Jira card and run end-to-end workflow via specialized subagents. Auto-advances phases; stops only at subtask-create + ship gates.
---

# /tba:flow <KEY>

**Orchestrator mode.** รัน pipeline เต็มสำหรับการ์ด 1 ใบ โดย **delegate ให้ subagents** แต่ละ phase

## Args
- `<KEY>` — Jira issue key (e.g. `RTRCDS-1234`)
- `--manual` (optional) — หยุดถาม user ทุก phase (default = auto, หยุดแค่ 2 gates)

## Gate policy (default auto)

| Gate | Confirm required? | เหตุผล |
|---|---|---|
| intake → trial | ❌ auto | แค่ load context, revertible |
| trial → post | ❌ auto | draft ยังไม่เข้า Jira |
| **post → subtask** | ✅ **confirm** | จะสร้าง subtasks ใน Jira ของจริง |
| subtask → build | ❌ auto | เริ่ม branch + implement |
| build → ship | ❌ auto per subtask | audit + e2e ใน local |
| **ship (any)** | ✅ **confirm** | เปลี่ยน status Jira ของจริง |

`--manual` ทำให้หยุดทุก gate

## Agents (ตามลำดับที่ถูกเรียก)

| Phase | Agent | Role |
|---|---|---|
| intake | 🦆 Case Officer | triage + load context |
| trial | 🔮 Architect | Q&A design (brainstorming, ภาษาไทย) |
| post | (orchestrator) | post plan → Jira |
| subtask | (orchestrator + user) | confirm + create subtasks |
| build | ⚙️ Field Agent | branch + implement per subtask |
| audit | 🔍 Auditor | verify + e2e + regression check |
| ship | (orchestrator + user) | confirm + transition → READY TO TEST |

## Steps

### Step 0 — Resume check

```bash
# ถ้า user ให้ <KEY> แต่มี active case อื่นอยู่ → แจ้ง
node ${CLAUDE_PLUGIN_ROOT}/scripts/case-state.mjs active
```

ถ้า active != new key → ถาม "มี case RTRCDS-XXXX ค้างอยู่ จะ pause ไว้แล้วเริ่ม <KEY> ใหม่ไหม? (y/n)"

### Step 1 — Dispatch Case Officer

ใช้ **Task tool** → `case-officer` subagent พร้อม prompt:
```
Open and triage case <KEY>. Report intake summary.
```
รอ return แล้ว print output ให้ user เห็น

Advance phase → `trial` (auto, no gate)

### Step 2 — Dispatch Architect

Task tool → `architect` subagent:
```
Convene Pre-Build Trial for <KEY>. Use brainstorming skill in Thai.
Produce plan.md at .tba/cases/<KEY>/plan.md.
```

**Important:** Architect จะ Q&A กับ user ตรง ๆ ผ่าน main thread — เพราะ Task tool รัน subagent ใน sub-session (ไม่มี user). **ให้ Architect เขียน Q&A script ส่งกลับ orchestrator, orchestrator forward ไปให้ user ตอบ** แล้ว feed ตอบกลับ Architect

> Alternative: ถ้า sub-session ไม่สามารถ Q&A กับ user ได้ตรง ๆ, Architect จะ:
> 1. วิเคราะห์ card context
> 2. generate draft plan + list "คำถามที่ยังค้าง"
> 3. ส่งกลับ orchestrator
> 4. Orchestrator show คำถามให้ user, รวบรวมคำตอบ, ส่งคำตอบไป Architect รอบ 2 เพื่อ finalize plan

(เลือกวิธีไหนก็ได้ — ขึ้นกับ tool capability)

Advance phase → `post`

### Step 3 — Post to Jira (auto)

```bash
cat .tba/cases/<KEY>/plan.md | \
  node ${CLAUDE_PLUGIN_ROOT}/scripts/jira.mjs comment <KEY> --stdin
```
Stamp `[✓ POSTED]`

Advance phase → `subtask`

### Step 4 — **GATE: Subtask Creation** (ขอ confirm)

Parse plan.md section "Subtasks ที่เสนอ" → แสดง list:
```
╭─ PROPOSED SUBTASKS for RTRCDS-1234 ─────────────╮
  1. [HC-MY-CAREER-API-EMPLOYEE] Create API
  2. [HC-MY-CAREER-API-EMPLOYEE-DB] Add table
  3. [HC-MY-CAREER-WEB] Render page
╰──────────────────────────────────────────────────╯

Create? (y/edit/skip)
```

- `y` → loop: `jira.mjs subtask <KEY> "<summary>"` for each
  - Record each created key via `case-state.mjs upsert-subtask`
- `edit` → open editor pattern (ask user to paste edited list)
- `skip` → leave subtasks empty, continue

Record gate: `case-state.mjs record-gate subtask-create <decision>`
Advance phase → `build`

### Step 5 — Build loop

สำหรับแต่ละ subtask ที่สร้างในขั้นก่อน (หรือ existing subtasks ของ card ที่ parseable):

#### 5a. Field Agent — branch + implement

Task tool → `field-agent`:
```
Implement subtask <SUBKEY>. Parent: <KEY>.
```

#### 5b. Auditor — verify + e2e

Task tool → `auditor`:
```
Audit subtask <SUBKEY>. Re-verify tests, review diff, generate e2e if FE.
```

Advance subtask status in case state.

#### 5c. **GATE: Ship Subtask** (ขอ confirm)

```
Ship RTRCDS-1235 → READY TO TEST? (y/n/next)
  y     → transition + record + continue to next subtask
  n     → skip, keep working
  next  → skip + jump to next subtask
```

ถ้า `y` → `jira.mjs transition <SUBKEY> "READY TO TEST"`

**Loop** จนกว่า subtasks จะ ship ครบ

### Step 6 — **GATE: Ship Main Card** (ขอ confirm)

```
All subtasks shipped. Ship main card RTRCDS-1234 → READY TO TEST? (y/n)
```

ถ้า `y`:
- `jira.mjs transition <KEY> "READY TO TEST"`
- Case phase → `ship` → `closed`

Print closing summary:
```
[✓ CASE CLOSED] RTRCDS-1234

  Subtasks shipped: 3 / 3
  Lines of code:    +812 -42
  Tests added:      28
  E2E scenarios:    3
  Jira:             READY TO TEST

  Handoff: notify QA, smoke-test if not already.
```

Record final gate.

## Rules

- **อย่าข้าม gate** — subtask-create + ship ต้อง confirm เสมอ (ยกเว้น `--yes` ที่ v2)
- **ถ้า user interrupt กลาง phase** → บันทึก state ปัจจุบัน + stamp `[⌛ CASE PAUSED]` — resume ด้วย `/tba:resume`
- **ถ้า agent error** → report ให้ user + ไม่ auto-retry
- **อย่า parallelize subtasks** — serial build ปลอดภัยกว่า (dependency risk)
- **Agent outputs ต้อง visible** — stream ให้ user เห็น agent คิดอะไร ทำอะไร
- **Resume-safe** — รีสตาร์ท Claude Code แล้ว `/tba:resume` ต้องกลับไปที่ phase เดิมได้

## Theme

- เริ่ม: `[🦆 CASE OPENED] RTRCDS-1234 — <summary>`
- Gate: `── Gate N: <description> ──`
- Phase transition: `[◉ ADVANCED] <from> → <to>`
- Pause: `[⌛ CASE PAUSED]`
- Close: `[✓ CASE CLOSED]`
- Abort: `[✂ CASE PRUNED]`
