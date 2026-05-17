# Service Table Refactor Progress

This file tracks the next major refactor for CRM Records service-specific tables.

Scope:

- Consolidate duplicated service table implementations into a shared service table system.
- Reuse common frame, filters, rows, and cell renderers across service tables.
- Preserve current UI, routes, actions, API contracts, and workflows.

Out of scope:

- No visual redesign.
- No behavior change.
- No route changes.
- No API payload or endpoint changes.
- No All Records table redesign in this pass.

## Current Status

- Records module structural refactor: completed
- Records module lint cleanup: completed
- Service table consolidation refactor: in progress

## Target Service Tables

1. `tables/service/TrainingRecordsTable.jsx`
2. `tables/service/IhRecordsTable.jsx`
3. `tables/service/ManpowerRecordsTable.jsx`
4. `tables/service/SpecialRecordsTable.jsx`
5. `tables/service/EquipmentRecordsTable.jsx`

## Phase Tracker

### Phase 1: Extract shared service table frame

Status: `completed`

Tasks:

1. Create `tables/service/ServiceRecordsTableBase.jsx`
2. Move shared loading state into base
3. Move shared filter row into base
4. Move shared advanced-filter panel into base
5. Move shared table shell into base
6. Keep current prop contract compatible

Completed:

- Added `tables/service/ServiceRecordsTableBase.jsx`
- Moved shared loading state into base
- Moved shared primary filter row into base
- Moved shared advanced-filter panel into base
- Moved shared table shell + empty state into base
- Updated all 5 service tables to render through the shared base while keeping row-specific rendering local

### Phase 2: Extract shared hooks and constants

Status: `completed`

Tasks:

1. Create `hooks/useServiceRecordsTableState.js`
2. Move shared filter/toggle/reset state into hook
3. Move shared options memo logic into hook/helper
4. Move shared `columnWidths` and `truncateStyle` into common constants
5. Keep helper signatures service-agnostic

Completed:

- Added `hooks/useServiceRecordsTableState.js`
- Moved shared filter/toggle/reset state into the shared hook
- Moved shared issuer/year options memo logic into the shared hook
- Added `config/serviceRecordsTableShared.js`
- Moved shared `columnWidths` and `truncateStyle` into shared constants
- Updated all 5 service table wrappers to consume the shared hook/constants while keeping service-specific filtering and row rendering local

### Phase 3: Define service config objects

Status: `completed`

Tasks:

1. Create `config/serviceRecordTableConfigs.js`
2. Add config entries for `training`, `ih`, `manpower`, `special`, `equipment`
3. Define service-specific field mapping:
   - `getSearchText`
   - `getSubject`
   - `getAmount` where needed
4. Keep configs pure and explicit

Completed:

- Added `config/serviceRecordTableConfigs.js`
- Added config entries for `training`, `ih`, `manpower`, `special`, and `equipment`
- Moved service-specific `getSearchText` logic into config
- Moved service-specific subject mapping into config
- Moved service-specific amount mapping into config where needed
- Updated service table wrappers to consume config-based field mapping without changing UI or workflow

### Phase 4: Convert simplest service tables to thin wrappers

Status: `completed`

Targets:

1. `TrainingRecordsTable.jsx`
2. `IhRecordsTable.jsx`
3. `SpecialRecordsTable.jsx`
4. `EquipmentRecordsTable.jsx`

Tasks:

1. Refactor each to use `ServiceRecordsTableBase`
2. Keep action props pass-through unchanged
3. Keep rendered output unchanged

Completed:

- Added `tables/service/ServiceConfiguredRecordsTable.jsx`
- Moved the shared configured row/filter/render logic for simple services into the new shared component
- Reduced `TrainingRecordsTable.jsx`, `IhRecordsTable.jsx`, `SpecialRecordsTable.jsx`, and `EquipmentRecordsTable.jsx` to thin wrappers
- Kept action prop pass-through unchanged
- Preserved the existing rendered output and search input ids where previously defined

### Phase 5: Refactor manpower table separately

Status: `completed`

Tasks:

1. Audit manpower-only behavior
2. Preserve service-details modal behavior
3. Keep HTML entity decoding behavior intact
4. Refactor using wrapper + base without polluting shared frame

Completed:

- Extended `ServiceConfiguredRecordsTable.jsx` with narrow override hooks for row key, subject cell, amount cell, and subject-text args
- Refactored `ManpowerRecordsTable.jsx` to use the shared configured table
- Kept the service-details modal local to manpower only
- Preserved HTML entity decoding for manpower service details and subject text
- Preserved manpower-specific secondary amount text and custom row-key fallback

### Phase 6: Extract shared row/cell renderers

Status: `completed`

Tasks:

1. Extract reusable service-table cells/render helpers
2. Reuse existing shared pieces:
   - `tables/shared/RecordActionMenu.jsx`
   - `tables/shared/RemarksCell.jsx`
3. Keep render contracts minimal and data-driven

Completed:

- Added `tables/service/ServiceRecordCells.jsx`
- Extracted reusable shared cells for index, id, client, subject, amount, created, status, remarks, and action
- Reused existing shared pieces through the extracted cells:
  - `tables/shared/RecordActionMenu.jsx`
  - `tables/shared/RemarksCell.jsx`
- Slimmed `ServiceConfiguredRecordsTable.jsx` by moving row-cell markup into the shared cell layer

### Phase 7: Reduce service table entry files

Status: `completed`

Tasks:

1. Keep service files as thin wrappers where possible
2. Minimize per-service files to config + pass-through logic
3. Isolate special cases to wrapper-only logic

Completed:

- Kept `TrainingRecordsTable.jsx`, `IhRecordsTable.jsx`, `SpecialRecordsTable.jsx`, and `EquipmentRecordsTable.jsx` as thin wrappers around the shared configured table
- Extracted manpower's modal presentation into `tables/service/ManpowerServiceDetailsModal.jsx`
- Reduced `ManpowerRecordsTable.jsx` to wrapper-level orchestration plus true manpower-only logic
- Preserved special-case logic inside the manpower wrapper path without leaking it into other services

### Phase 8: Registry and integration verification

Status: `completed`

Tasks:

1. Verify `config/recordTables.js`
2. Verify parent page/controller wiring still works
3. Verify all row action handlers still behave the same

Completed:

- Verified `config/recordTables.js` still maps each service tab to the correct refactored table component
- Verified `useRecordsController.js` still resolves the active table component from the registry without contract changes
- Verified `RecordsPage.jsx` still mounts the active table through the same `tableProps` interface
- Verified action handler pass-through remains unchanged across service wrappers and the shared configured table
- Confirmed no stale references remain to pre-consolidation service table paths outside the progress tracker

### Phase 9: Final regression verification

Status: `completed`

Tasks:

1. Check all 5 service tabs on desktop
2. Check filters, advanced filters, reset, and search
3. Check remarks modal and action menu behavior
4. Check detail page navigation and actions
5. Run lint
6. Run production build

Completed:

- Ran full lint for `src/views/crm/records`
- Ran production build successfully
- Performed final static verification across all 5 service table integrations:
  - filter/search/reset contract remains shared through `ServiceConfiguredRecordsTable.jsx`
  - remarks and action menu behavior remain routed through shared cells/components
  - detail-page navigation/action wiring remains controller-driven and unchanged in contract
- Confirmed the refactor chain is structurally stable at code, lint, and build level

Note:

- Browser click-through validation for all 5 tabs was not executed from this environment. Interactive UI verification still requires a real browser session.

## Working Rules

1. Prefer extraction before replacement.
2. Refactor easiest service tables first.
3. Refactor manpower last.
4. Keep all changes behavior-neutral.
5. Validate after each phase.

## Update Log

- `2026-05-06`: Tracker file created. Service-table consolidation planned, not started.
- `2026-05-06`: Phase 1 completed. Shared service table base extracted and adopted by all service tables without intended UI or workflow changes.
- `2026-05-06`: Phase 2 completed. Shared filter state and table constants extracted into reusable hook/config modules.
- `2026-05-06`: Phase 3 completed. Service-specific field mapping extracted into `serviceRecordTableConfigs`.
- `2026-05-06`: Phase 4 completed. The simple service tables were collapsed into a shared configured implementation, leaving manpower separate as the known outlier.
- `2026-05-06`: Phase 5 completed. Manpower was moved onto the shared configured table path while keeping its service-details modal and HTML decoding local.
- `2026-05-06`: Phase 6 completed. Shared service-table row and cell renderers were extracted into `ServiceRecordCells.jsx`.
- `2026-05-06`: Phase 7 completed. Service entry files were reduced further, and manpower-only presentation was isolated into its own modal component.
- `2026-05-06`: Phase 8 completed. Registry mapping, controller resolution, and service table integration contracts were verified.
- `2026-05-06`: Phase 9 completed. Final lint, build, and static regression verification passed; browser click-through remains a separate manual check.
