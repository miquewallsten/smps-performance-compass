# Work Areas & Position Management — Design Spec

**Date:** 2026-05-26  
**Status:** Approved  

## Problem

Job positions (CVE Puestos) are split between a hardcoded catalog (`POSITION_CATALOG` in `src/data/positionCatalog.ts` and `server/data/positionCatalog.ts`) and a `custom_positions` DB table. This creates a dual-source-of-truth problem: the code merges both at runtime, making it unclear what is authoritative. There is no dedicated UI to manage areas or positions — a cramped modal inside UserManagement is all that exists, and it only supports add/delete (no edit). Work areas are inferred from `practice_area` + `level` columns rather than being explicit entities. Location data (city, office, floor, desk) does not exist at all.

## Solution

Make the database the single source of truth for work areas, positions, and locations. Create a dedicated admin page for managing them. Remove all runtime references to the hardcoded catalog. Wire every consumer (user creation, evaluation questions, org chart, profile display) to derive area/level/position from the DB via API.

## Database Schema

### New `work_areas` table

```sql
CREATE TABLE IF NOT EXISTS work_areas (
  id VARCHAR(50) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  level ENUM('legal','administrativo') NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `custom_positions` table changes

Add columns, migrate data, then drop old columns:

```sql
ALTER TABLE custom_positions ADD COLUMN work_area_id VARCHAR(50);
ALTER TABLE custom_positions ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- Migration: populate work_area_id from existing practice_area/level logic
UPDATE custom_positions SET work_area_id = practice_area WHERE level = 'legal' AND practice_area IS NOT NULL;
UPDATE custom_positions SET work_area_id = 'administrativo' WHERE level = 'administrativo';
-- Then drop legacy columns
ALTER TABLE custom_positions DROP COLUMN practice_area;
ALTER TABLE custom_positions DROP COLUMN level;
```

Final schema:

```sql
custom_positions (
  id VARCHAR(36) PRIMARY KEY,          -- CVE code, e.g. "SMPS12"
  label VARCHAR(255) NOT NULL,         -- e.g. "Asociado Jr Corporativo"
  work_area_id VARCHAR(50) NOT NULL,   -- FK → work_areas.id
  base_position VARCHAR(50) NOT NULL,  -- e.g. "asociado_jr"
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_area_id) REFERENCES work_areas(id)
);
```

### New `locations` table

```sql
CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR(50) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  city VARCHAR(255),
  office VARCHAR(255),
  floor VARCHAR(50),
  desk VARCHAR(50),
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `users` table change

```sql
ALTER TABLE users ADD COLUMN location_id VARCHAR(50);
```

No FK constraint — location_id is optional and nullable.

**Important:** `users.practice_area` column is KEPT as a denormalized convenience field. It is auto-set from the position's `work_area_id` when a user is created or their position is changed. Only `custom_positions.practice_area` and `custom_positions.level` are removed — those are replaced by the `work_area_id` FK.

## Server API

### `/api/work-areas`

| Method | Auth | Description |
|--------|------|-------------|
| `GET /` | Any authenticated | List all areas with position counts |
| `POST /` | Admin | Create area (id, label, level, sortOrder) |
| `PATCH /:id` | Admin | Update area (label, level, sortOrder) |
| `DELETE /:id` | Admin | Delete area — 409 if positions are assigned |

GET returns each area with its positions joined:

```json
[
  {
    "id": "corporativo",
    "label": "Corporativo",
    "level": "legal",
    "sortOrder": 1,
    "positions": [
      { "id": "SMPS03", "label": "Socio Corporativo", "basePosition": "socio", ... },
      { "id": "SMPS12", "label": "Asociado Jr Corporativo", "basePosition": "asociado_jr", ... }
    ]
  }
]
```

### `/api/positions`

| Method | Auth | Description |
|--------|------|-------------|
| `GET /` | Any authenticated | List all positions (optional `?work_area_id=` filter) |
| `GET /:id` | Any authenticated | Get single position with area info |
| `POST /` | Admin | Create position (id, label, workAreaId, basePosition) |
| `PATCH /:id` | Admin | Update position (id/label/workAreaId/basePosition) |
| `DELETE /:id` | Admin | Delete — 409 if users are assigned |

GET / returns positions joined with work_areas:

```json
[
  {
    "id": "SMPS12",
    "label": "Asociado Jr Corporativo",
    "workAreaId": "corporativo",
    "workAreaLabel": "Corporativo",
    "workAreaLevel": "legal",
    "basePosition": "asociado_jr",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

### `/api/locations`

| Method | Auth | Description |
|--------|------|-------------|
| `GET /` | Any authenticated | List all locations |
| `POST /` | Admin | Create location |
| `PATCH /:id` | Admin | Update location |
| `DELETE /:id` | Admin | Delete — 409 if users are assigned |

## Seed Data

On `POST /api/system/init`, the server seeds:

1. **5 work_areas** from the current hardcoded list:
   - corporativo, consultoria_fiscal, litigio_fiscal, general (legal)
   - administrativo (administrativo)

2. **29 custom_positions** with `work_area_id` set (no more `practice_area`/`level`)

3. **No locations seeded** — admin creates them as needed

The `server/data/positionCatalog.ts` file is updated to output the new schema shape. It is only imported by `server/routes/system.ts` for seeding — never at runtime.

## Frontend

### New Page: `PositionManagement` (`/positions` route)

Admin-only page with two sections (tabs):

**Tab 1: Áreas y Puestos**

- Accordion grouped by work area
- Each area header shows: label, level badge, position count, edit/delete buttons
- Each area body: table of positions (CVE, Label, Base Position, Edit, Delete)
- "Add Position" button per area
- "Add Area" button at top
- Add/Edit area modal: id (slug), label, level (legal/administrativo), sort order
- Add/Edit position modal: CVE (id), label, work area (dropdown), base position (dropdown)

**Tab 2: Ubicaciones**

- Table: label, city, office, floor, desk, edit, delete
- Add/Edit modal for location fields
- Tags rendered as compact badges: `CDMX · Oficentro · P3 · A12`

### Navigation

Add "Áreas y Puestos" nav item in `Layout.tsx` sidebar, visible to admins and superusers only. Icon: `Briefcase` from lucide. Route: `/positions`.

### UserManagement Changes

- **Remove** the embedded position manager modal entirely
- Position dropdown in Add/Edit user reads from `usePositions()` + `useWorkAreas()` API hooks (replaces merged hardcoded + DB logic)
- Add location dropdown to Add/Edit user form
- When selecting a position: `position`, `practiceArea`, `level` are auto-set from the position's `basePosition` and `workAreaLevel`
- Display uses resolved position label: `SMPS12 · Asociado Jr Corporativo`

### Files to Delete / Replace

| File | Action |
|------|--------|
| `src/data/positionCatalog.ts` | **Delete** — replaced by API hooks |
| `server/data/positionCatalog.ts` | **Keep** — seed-only, update schema shape |

### Files to Update

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `WorkArea`, `Location` types. Update `CustomPosition` to use `workAreaId` instead of `practiceArea`/`level` |
| `src/contexts/AuthContext.tsx` | Add `locationId` to `AuthUser` |
| `src/api/queries.ts` | Add `useWorkAreas`, `useCreateWorkArea`, `useUpdateWorkArea`, `useDeleteWorkArea`, `useUpdatePosition`, `useLocations`, `useCreateLocation`, `useUpdateLocation`, `useDeleteLocation` |
| `src/pages/UserManagement.tsx` | Remove position manager modal. Use API hooks for position/area data. Add location selector |
| `src/contexts/AppContext.tsx` | Remove `asCustomPositions` import |
| `src/components/Layout.tsx` | Add nav item for `/positions` |
| `src/App.tsx` | Add route for `/positions` |
| `server/db/migrate.ts` | Add `work_areas` table, `locations` table, alter `custom_positions`, alter `users` |
| `server/routes/positions.ts` | Add PATCH, join with work_areas, add work_area_id filter |
| `server/routes/system.ts` | Update seed to use new schema |
| `server/routes/users.ts` | Include `location_id` in safe columns, handle in create/update |
| `server/routes/copilot.ts` | Update user creation to derive area from position's work_area |
| `server/data/positionCatalog.ts` | Update to new schema (workAreaId instead of practiceArea/level) |

### Consumer Code: Derived Area/Level

All places that currently check `POSITION_LEVELS[position]` or `user.practiceArea` to determine legal vs administrativo will instead:

1. Get the position's `workAreaLevel` from the joined API response
2. For `users.practice_area` (kept as a denormalized column for query convenience), it is auto-set when a user's position is assigned/changed

Key affected files:
- `src/data/questions.ts` — `getQuestionsForUser` reads area from position data
- `src/pages/MyProfile.tsx` — display level from position
- `src/components/HierarchyFilters.tsx` — filter by level from position
- `src/pages/OrgChart.tsx`, `Dashboard.tsx`, `Reports.tsx` — group by level from position
- `src/pages/Communications.tsx` — audience targeting by level

## User Creation/Edit Flow

1. Admin selects a **Position** from dropdown (grouped by Work Area optgroups)
2. System auto-populates: `position` = position.basePosition, `practiceArea` = position.workAreaId (for legal), `customPositionId` = position.id
3. Admin optionally selects a **Location** from dropdown
4. On save, all derived fields are persisted to the user row

## Error Handling

- **Delete area with positions:** 409 error, message "Cannot delete area with assigned positions"
- **Delete position with users:** 409 error, message "Cannot delete position with assigned users"
- **Delete location with users:** 409 error, message "Cannot delete location with assigned users"
- **Duplicate CVE/area id:** 409 error on create
- **CVE change with assigned users:** Allowed — the `custom_position_id` on users updates cascade via the foreign key reference (or we block CVE changes for positions with users and require admin to unassign first)

Decision: **Block CVE id changes for positions that have users assigned.** Admin must remove users from the position first, then change the CVE, then reassign.

## Scope Boundaries

- This spec does NOT change evaluation question logic beyond wiring it to the new position/area data source
- This spec does NOT change vacation config logic (it still keys off `base_position`)
- The `POSITION_LABELS` map in `types/index.ts` stays (it maps base position slugs to labels, which is orthogonal to CVE positions)
- The `POSITION_RANK` and hierarchy arrays stay (they operate on base positions, not CVE codes)
