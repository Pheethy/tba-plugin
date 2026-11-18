---
description: TBA — manage hc-my-career-docs (shared project-level architecture docs)
---

# /tba:docs <subcommand>

Manage **shared architecture docs repo** (`hc-my-career-docs`) — ที่เก็บ system map + per-service snapshot + guides ที่ทีมใช้ร่วมกัน

## Subcommands

### `where`
Print absolute path ของ docs folder (จาก config)
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/docs.mjs where
```

### `status`
ตรวจสถานะ — มีอยู่ไหม, เป็น git repo รึยัง, มี `tba/project.json` รึยัง
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/docs.mjs status
```

### `init`
สร้าง skeleton folder structure + ลงทะเบียน services ทั้งหมดใน workspace
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/docs.mjs init
```

จะสร้าง:
```
<docs-root>/
├── README.md
├── tba/
│   ├── project.json            # service registry (auto-populated)
│   └── services/               # per-service snapshots
└── guides/                     # manual how-to
```

หลัง init ให้แนะนำ user:
- (optional) ย้ายไฟล์ `.md` + `docker-compose.yml` + `sprints/` ที่ลอย root มาเข้า `guides/` และ `infrastructure/`
- (optional) `git init` + push ขึ้น GitLab ThaiBev เมื่อได้ repo
- รัน `/tba:docs scan` ต่อเลย

### `pull`
ถ้า docs เป็น git repo แล้ว → `git pull --ff-only`
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/docs.mjs pull
```

### `services`
List service ทั้งหมดที่ docs รู้จัก (จาก `project.json` หรือ discovery)
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/docs.mjs services
```

### `scan`
Scan ทุก service → aggregate excerpts ลง `<docs-root>/tba/.cache/scan.json` (ใช้ Scout animation)
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/docs.mjs scan
```

หลัง scan เสร็จ → **Claude Code compose markdown**:
- `<docs-root>/tba/system-map.md` — overview ทั้ง project
- `<docs-root>/tba/service-boundaries.mmd` — mermaid: ใครคุยกับใคร
- `<docs-root>/tba/services/<name>.md` — per-service snapshot

**Rules for composition:** (เหมือน `/tba:scan` แต่ scope เป็น cross-service)
- ชี้ดูไฟล์ `<service>/manifest`, `<service>/*.proto`, `<service>/openapi*` เพื่อหา API contract
- หา pattern การเรียกข้าม service (grpc client config, HTTP URLs, message queue topics)
- ถ้าเจอ **cross-service dependency** → วาด edge ใน `service-boundaries.mmd`

### `publish "<message>"`
ถ้า docs เป็น git repo → `git add -A && git commit -m "<message>" && git push`
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/docs.mjs publish "update system map after onboarding service X"
```

## Typical flow

```bash
# ครั้งแรก (lead / architect):
/tba:docs init
/tba:docs scan
# Claude compose system-map.md + service-boundaries.mmd + services/*.md
# user review
/tba:docs publish "initial system map for hc-my-career"

# ทุกวัน (dev):
/tba:docs pull
/tba:case RTRCDS-1234     # context ประกอบ

# หลังเพิ่ม/เปลี่ยน service significant:
/tba:docs scan
# Claude update services/<changed>.md + system-map.md if needed
/tba:docs publish "update <service> after X feature"
```

## Notes

- ถ้ายังไม่มี `hc-my-career-docs` git repo ที่ GitLab → `init` + ทำงาน local ไปก่อนได้, `pull`/`publish` จะ warn แต่ไม่ error
- `scan` เรียก `scripts/scan.mjs` ภายใต้ hood กับทุก service — ปลอดภัยเพราะ scanner skip secrets อยู่แล้ว
- ไฟล์ `tba/.cache/` **ไม่ควร commit** — เพิ่มใน `.gitignore` ของ docs repo
