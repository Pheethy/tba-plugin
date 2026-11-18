---
description: TBA — generate Playwright E2E test for a subtask in the frontend repo (requires Playwright MCP)
---

# /tba:e2e <SUBTASK-KEY>

สร้าง Playwright E2E test ใน **frontend repo** (`hc-my-career-web`) ตาม path pattern:
```
e2e/playwright/sprint{N}/{SUBTASK-KEY}/*.spec.ts
```

## Preconditions

- ต้องมี **Playwright MCP** ติดตั้งใน Claude Code (user ติดตั้งเอง)
- Subtask ควรเป็น frontend-related (`[HC-MY-CAREER-WEB]`) หรือการ์ด parent มี FE component — แม้ subtask อื่น ๆ ก็ gen e2e ครอบคลุม FE path ได้

## Steps

### 1. Load context
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/jira.mjs case <KEY>
```
เก็บ summary + description เป็น scenario source

### 2. Resolve FE repo path
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs show | jq -r '.e2e.repo, .workspace.root'
```
→ `<workspace.root>/<e2e.repo>` = `~/go/src/gitlab.thaibevapp.com/my-career/hc-my-career-web` (default)

### 3. Detect sprint
```bash
# Try Jira first
node ${CLAUDE_PLUGIN_ROOT}/scripts/sprint.mjs detect <KEY> 2>/dev/null
# Fallback: latest folder
node ${CLAUDE_PLUGIN_ROOT}/scripts/sprint.mjs latest-folder <web-repo>/e2e/playwright 2>/dev/null
# Final fallback: ask user
```

ถ้า detect ไม่ได้ทั้ง 2 → prompt: `"Sprint ไหน? (e.g. sprint16)"`

### 4. Compute target path
```
<web-repo>/e2e/playwright/<sprint>/<KEY>/
```

Create if missing:
```bash
mkdir -p <target>
```

### 5. Generate spec file

**Required: Use Playwright MCP** (`mcp__playwright__*` tools) to:
- (ถ้า app running) Explore live DOM → infer selectors
- Generate test code ตาม scenario ใน AC
- Test shape:
  ```typescript
  import { test, expect } from '@playwright/test';

  test.describe('<KEY> — <summary>', () => {
    test.beforeEach(async ({ page }) => {
      // login flow (ปกติมี shared helper ใน e2e/playwright/login/)
    });

    test('scenario: <AC #1>', async ({ page }) => {
      // ...
    });

    test('scenario: <AC #2>', async ({ page }) => {
      // ...
    });
  });
  ```

**ถ้าไม่มี Playwright MCP** → gen skeleton ตาม AC แล้ว warn:
```
[⚠ NO LIVE EXPLORATION]
Spec generated from AC only. Install Playwright MCP for live selector discovery:
  (ดู https://github.com/microsoft/playwright-mcp)
```

### 6. Smoke-run (optional but recommended)
ถ้า web app รันอยู่ + Playwright config ใน repo:
```bash
cd <web-repo> && npx playwright test e2e/playwright/<sprint>/<KEY>/
```
ถ้า fail → analyze + แก้ spec (ไม่ใช่ mock)

### 7. Report
```
[◎ E2E DRAFTED] RTRCDS-1235

  Spec:    hc-my-career-web/e2e/playwright/sprint16/RTRCDS-1235/career-path.spec.ts
  Tests:   3 scenarios from AC
  Status:  <3 passed | 2 passed 1 failed | not yet run>

  Next:
    cd <web-repo> && npx playwright test ...
    git add . && git commit && git push
    /tba:ship <KEY>
```

## Rules

- **เก็บ test ใน FE repo เท่านั้น** — BE microservices ไม่มี e2e folder (per team decision)
- **ไม่ mock network calls** — e2e ต้องชนจริง (ใช้ test env)
- **Login shared** — ใช้ `e2e/playwright/login/` ที่มีอยู่แล้ว ไม่เขียน login ซ้ำ
- **One file per scenario or feature** — อย่า dump ทุก scenario ลงไฟล์เดียวใหญ่ ๆ
- **Selectors เสถียร** — ใช้ `data-testid` > role > text ตามลำดับ. หลีกเลี่ยง CSS selectors ที่ fragile

## Theme

- Dialog: *"Audit protocol activated."*
- Done: *"Audit complete. Sacred Timeline verified."*
