---
description: TBA — implement subtask (load context + write code + unit tests). Operates in current repo on current branch.
---

# /tba:implement <SUBTASK-KEY>

ลงมือเขียนโค้ด + unit tests ตามสิ่งที่ subtask ขอ **บน branch ปัจจุบัน**, **ใน repo ปัจจุบัน**

## Preconditions

- Current directory = repo ที่ตรงกับ subtask `[REPO-NAME]` (ปกติมาจาก `/tba:branch`)
- Current branch = `feature/rtrcds-<id>`
- **ถ้า 2 ข้อบนไม่ตรง** → warn user + ถาม confirm ก่อนลงมือ

## Steps

### 1. Verify environment
```bash
pwd
git branch --show-current
```
Compare กับ subtask key + repo ที่คาด

### 2. Load context (critical)

ลำดับ priority:

1. **Parent card plan** — ถ้ามี `.tba/trials/<PARENT-KEY>/plan.md` → อ่านทั้งไฟล์
   - หา parent key: `node ${CLAUDE_PLUGIN_ROOT}/scripts/jira.mjs case <KEY> | jq -r .parent`
2. **Subtask detail** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/jira.mjs case <KEY>`
3. **Repo project map** — ถ้ามี `.tba/project-map.md` → อ่าน
4. **Cross-service context** — ถ้ามี `<docs>/tba/system-map.md` → อ่านส่วนที่เกี่ยว

### 3. Propose implementation plan

สรุปให้ user ก่อนเขียน:
```
[◉ IMPLEMENTATION PROPOSAL] RTRCDS-1235

  Subtask: [HC-MY-CAREER-API-EMPLOYEE] Create career path API

  Plan:
    1. Add handler: internal/handler/career_path_handler.go
    2. Add service:  internal/service/career_path_service.go
    3. Add repo:     internal/repository/career_path_repo.go
    4. Wire router:  cmd/api/router.go (POST /v1/career-paths)
    5. Unit tests:   *_test.go for each layer

  Deps added: none
  Migrations:  none (DB subtask separate)

  Proceed? (y/edit/abort)
```

### 4. Implement

ลุย — ใช้ Claude Code normal flow:
- **Follow existing patterns** — อ่าน sibling files, imitate layering, naming, error handling
- **TDD when feasible** — test ก่อน code
- **Unit tests required** — หลีกเลี่ยง "I'll add tests later"
- **No new deps** without asking — ถ้าจำเป็นให้ confirm ก่อน `go get` / `npm i`
- **Follow existing linting** — รัน formatter/linter ถ้ามีใน repo

### 5. Verify

```bash
# detect & run:
go test ./...    # or: npm test, pnpm test, bun test, pytest, etc.
```

ถ้า test ไม่ผ่าน → แก้ ไม่ใช่ mock
ถ้ามี lint → run และแก้

### 6. Report

```
[◎ IMPLEMENTATION COMPLETE] RTRCDS-1235

  Files changed: 5  (+312 -0)
  Tests:         12 added, all passing
  Lint:          clean

  Branch:        feature/rtrcds-1235  (not yet pushed)

  Next:
    git status / git diff           → review
    git commit -am "..." && git push
    /tba:e2e <KEY>                  → gen Playwright E2E (if applicable)
    /tba:ship <KEY>                 → transition subtask → READY TO TEST
```

## Rules

- **อย่าแตะ repo อื่น** — subtask นี้ scope อยู่ที่ repo นี้เท่านั้น ถ้าต้องแตะหลาย repo = split subtask
- **อย่า `git commit` อัตโนมัติ** — dev ตัดสินใจเองว่าจะ commit เมื่อไหร่, message ว่ายังไง
- **อย่า push** — dev push เอง
- **อย่า transition Jira** — ใช้ `/tba:ship` ต่างหาก
- **ถาม confirm ก่อนเพิ่ม dep** — เพิ่ม library ใหม่ = decision ระดับทีม

## Theme

- Dialog: *"Agent engaged. Variance within parameters."*
- Alert: *"Quack! Test variance detected."* (เมื่อ test fail)
- Done: *"Audit-ready."*
