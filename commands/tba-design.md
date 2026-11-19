---
description: TBA — Pre-Build Trial. Q&A design session (ภาษาไทย) สำหรับ Jira card → api-blueprint, ER diagram, sequence diagram
---

# /tba:design <KEY>

เข้า **Pre-Build Trial** — session ออกแบบแบบถาม-ตอบ (**ภาษาไทย**) สำหรับการ์ด RTRCDS 1 ใบ จบแล้วได้ draft plan พร้อม post เข้า Jira

## Args
- `<KEY>` — Jira issue key (e.g. `RTRCDS-1234`)

## ⚠ Language rule

**ทุกคำถามและ draft output ใช้ภาษาไทยเป็นหลัก** (ยกเว้น code identifier, API path, enum, field name — เหล่านี้คงเป็นอังกฤษ)

ตัวอย่าง:
- ✅ "เป้าหมายของ feature นี้คืออะไรจริง ๆ นอกจากที่เขียนใน AC?"
- ✅ "API endpoint ใหม่ที่ต้องเพิ่มคืออะไรบ้าง? ใช้ repo ไหน?"
- ❌ "What's the real goal of this feature..."

## Steps

### 1. Load card context

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/jira.mjs case <KEY>
```

เก็บ summary + description + AC ไว้เป็น context

### 2. Load relevant repo context (optional)

- ถ้าใน CWD มี `.tba/cache/scan.json` → อ่านมาประกอบ
- ถ้าใน workspace มี `hc-my-career-docs/tba/system-map.md` → อ่านเฉพาะส่วนที่เกี่ยว

### 3. Invoke brainstorming skill

ก่อนถามคำถาม ให้ invoke skill `superpowers:brainstorming` (หรือ `tb-brainstorming` ถ้ามี) ผ่าน Skill tool
→ **ให้ skill handle flow Q&A** โดยคุณต้องสั่งให้ skill คุยภาษาไทย

ถ้า skill ไม่มี → fallback เป็น structured Q&A ภาษาไทยตามลำดับนี้ (ถาม**ทีละข้อ** รอคำตอบก่อนข้ามไปข้อถัดไป):

**Phase 1 — เข้าใจเจตนา (1-2 คำถาม)**
- "เป้าหมายจริง ๆ ของ feature นี้คืออะไร? (นอกเหนือจากที่ AC เขียนไว้)"
- "user หลักคือใคร? (employee / planner / admin / HR)"

**Phase 2 — Data model (ER)**
- "มี entity หรือ table ใหม่ที่ต้องเพิ่มไหม? ถ้ามี field อะไรบ้าง ความสัมพันธ์เป็นยังไง?"
- "กระทบ table เดิมใน DB ตัวไหน? ต้องเขียน migration แบบไหน?"

**Phase 3 — API surface**
- "API endpoint ใหม่/ที่ต้องแก้มีอะไรบ้าง? ใช้ repo ไหน? (hc-my-career-api-*)"
- "request/response shape เป็นยังไง? ต้อง auth หรือ role อะไร?"

**Phase 4 — Flow (sequence)**
- "flow ตั้งแต่ user action → FE → BE → DB → response เป็นยังไง?"
- "มี async process / cron / webhook เกี่ยวข้องไหม?"

**Phase 5 — Edge case + risk**
- "edge case อะไรที่ต้องระวัง? (concurrent, duplicate, timezone, null, race condition)"
- "มี dependency กับ feature อื่นที่กำลังทำอยู่ไหม?"

### 4. Compose design draft (ภาษาไทย)

จาก Q&A → เขียน markdown ตาม structure ด้านล่าง ลง `.tba/trials/<KEY>/plan.md`:

```markdown
# <KEY> — Pre-Build Trial

> สร้างโดย TBA เมื่อ <timestamp>
> Agent: <email จาก config>

## เจตนา (Intent)
<1-2 บรรทัดสรุปเป้าหมายจริง ๆ ของ feature นี้>

## User & Impact
- Persona: ...
- Impact: ...

## Data Model (ER)
\`\`\`mermaid
erDiagram
  ...
\`\`\`

- **ใหม่:** ...
- **แก้ไข:** ...
- **Migration notes:** ...

## API Blueprint
### [HC-MY-CAREER-API-<name>]
- `POST /v1/...`
  - **Request:** ...
  - **Response:** ...
  - **Auth:** ...
  - **Errors:** ...

## Sequence
\`\`\`mermaid
sequenceDiagram
  participant U as User
  participant W as Web
  participant A as API
  participant D as DB
  U->>W: ...
  ...
\`\`\`

## Edge Cases & Risk
- ...

## Subtasks ที่เสนอ
- `[HC-MY-CAREER-API-EMPLOYEE]` ...
- `[HC-MY-CAREER-API-EMPLOYEE-DB]` ...
- `[HC-MY-CAREER-WEB]` ...

## คำถามที่ยังค้าง
- ...
```

> **หมายเหตุ:** คำที่เป็น technical term (API, endpoint, migration, race condition, mermaid, field name) **ไม่ต้องแปล** — ใช้ทับศัพท์ได้เลย, dev อ่านง่ายกว่า

Save:
```bash
mkdir -p .tba/trials/<KEY>
# เขียน plan.md ลง .tba/trials/<KEY>/plan.md
```

### 5. Present draft + next actions (ภาษาไทย)

```
[◉ TRIAL DRAFT READY] .tba/trials/<KEY>/plan.md

Preview (400 ตัวอักษรแรก):
  <content>
  ...

สิ่งที่ทำได้ต่อ:
  /tba:post <KEY>      → post plan นี้เข้า Jira comment
  /tba:subtask <KEY>   → สร้าง subtask จาก section "Subtasks ที่เสนอ"
  (หรือแก้ไฟล์ .tba/trials/<KEY>/plan.md ก่อน post)
```

## Rules

- **ต้องถามจริง** อย่าเดา — Jira card มี context ที่ TBA มองไม่เห็นเสมอ
- **ภาษาไทยเสมอ** ใน Q&A และ narrative ของ plan — code/API/field ให้คงอังกฤษ
- **ไม่ post เข้า Jira ใน command นี้** — สร้าง draft เท่านั้น
- **reuse brainstorming skill** ถ้ามี — มันออกแบบมาเพื่อ clarify intent + explore design โดยเฉพาะ (บอก skill ว่าให้คุยไทย)
- Diagram เป็น **mermaid** เสมอ (GitLab/Jira preview ได้)
- ถ้า user ขอ "ข้ามคำถาม" → gen draft ตาม AC ล้วน ๆ แล้วใส่ `**TODO (ยังไม่ confirm กับ user):**` ไว้ทุกจุดที่เดา

## Theme

- เริ่ม session: `[⌛ PRE-BUILD TRIAL CONVENED]`
- จบ: `[◉ TRIAL DRAFT READY]`
- ถ้า user abort: `[✂ TRIAL ADJOURNED]`
