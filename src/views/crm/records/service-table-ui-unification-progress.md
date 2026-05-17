# Service Table UI Unification Progress

This file tracks the UI/UX unification of CRM Records service-specific tables so they match the `All` table system.

Scope:

- Bring service tables onto the same desktop/mobile table UI language as the `All` records table.
- Reuse existing `All`-table UI patterns where possible.
- Preserve service-specific data mapping, actions, routes, and API contracts.

Out of scope:

- No backend/API changes.
- No action workflow changes.
- No detail-page redesign in this pass.
- No `All` table redesign in this pass.

## Current Status

- Service table structural consolidation: completed
- Service table UI unification: completed

## Reference Implementation

- `tables/all/AllRecordsTable.jsx`
- `tables/all/AllRecordsFilterPanel.jsx`
- `components/datatable/DataTableRecordList.jsx`
- `components/datatable/DataTableDesktop.jsx`
- `components/datatable/DataTableFooter.jsx`
- `scss/custom.scss` records-table classes

## Target Service Tables

1. `tables/service/TrainingRecordsTable.jsx`
2. `tables/service/IhRecordsTable.jsx`
3. `tables/service/ManpowerRecordsTable.jsx`
4. `tables/service/SpecialRecordsTable.jsx`
5. `tables/service/EquipmentRecordsTable.jsx`

## Locked UI Contract

Service tables must align to these `All`-table patterns:

1. Top utility/search row

- Compact search input
- Compact action button cluster on the right
- Filter toggle button style
- Reset button style
- Layout spacing consistent with `records-filter-row`

2. Advanced filter panel

- Collapse/expand behavior consistent with `All`
- Same compact control density
- Same label sizing and row spacing

3. Desktop table shell

- Wrapped in `records-table-shell`
- Use compact table styling via `records-table-compact`
- Use `table-scroll-viewport` for horizontal/vertical table scrolling
- Use sticky action column behavior equivalent to `All`
- Use the same header background, border, font weight, and font sizing conventions

4. Row/cell treatment

- Same row density target
- Same truncation behavior
- Same tooltip behavior
- Same remarks-cell presentation model
- Same action-cell interaction zone behavior
- Same badge visual language for status

5. Footer utilities

- Rows-per-page selector
- Showing x-y of z text
- Prev/next pager
- Same compact footer layout conventions as `All`

6. Mobile direction

- Mobile parity should follow the `All` table card/list pattern unless explicitly deferred in a later phase

## Explicit Non-Goals For Service Tables

These are not automatically required in the first UI unification passes:

1. Column chooser

- `All` has a show/hide columns control.
- Service tables may omit this initially unless later justified.

2. CSV export

- Service tables may omit this initially unless later included deliberately.

3. Service column

- `All` needs this because it mixes services.
- Individual service tabs do not.

4. Exact column set parity

- Service tabs should match visual system and interaction language.
- They do not need to mirror the `All` table column model 1:1.

## Phase Tracker

### Phase 1: Audit and lock target UI contract

Status: `completed`

Tasks:

1. Treat `AllRecordsTable.jsx` and its subcomponents as the UI reference
2. Lock the exact UI patterns service tables must match
3. Document which `All` features are intentionally not reused initially
4. Establish this tracker for the UI unification workstream

Completed:

- Created this tracker
- Locked the `All`-table desktop utility/filter/table/footer contract as the target
- Documented which `All` features are intentionally excluded from the first service-table UI migration passes
- Confirmed the next real migration target is `tables/service/ServiceRecordsTableBase.jsx`

### Phase 2: Extract reusable UI primitives from `All`

Status: `completed`

Tasks:

1. Identify which `All` UI parts can be generalized cleanly
2. Extract shared utility/filter/footer/viewport/header style primitives where justified
3. Keep `All` table behavior unchanged during extraction

Completed:

- Added `config/recordsTableUiShared.js` for shared desktop breakpoint, truncation, and sticky header/action style primitives
- Added `tables/shared/RecordsTableFooter.jsx` as a reusable footer utility component
- Updated `tables/all/AllRecordsTable.jsx` to consume the shared table UI style primitives
- Updated `tables/all/AllRecordsTable.jsx` to consume shared datatable primitives without changing `All` behavior
- Kept `All` table behavior unchanged while extracting the reusable pieces needed for service-table shell migration

### Phase 3: Replace the legacy service-table shell

Status: `completed`

Tasks:

1. Rebuild `ServiceRecordsTableBase.jsx` on the newer UI shell
2. Adopt compact utility row behavior
3. Adopt compact desktop table shell and sticky action column behavior
4. Keep current service data/render contracts intact

Completed:

- Rebuilt `tables/service/ServiceRecordsTableBase.jsx` on the newer compact records-table shell
- Replaced the labeled top filter row with the compact search + filter-toggle + reset utility row
- Moved the service filters into the advanced-collapse panel while keeping filter behavior unchanged
- Wrapped the service table in `records-table-shell` and `table-scroll-viewport`
- Applied compact table density through `records-table-compact`
- Applied shared sticky action-header and action-cell behavior to the service table shell
- Kept the service row rendering contract intact by extending `renderRow(record, index, rowUi)` with UI-only sticky action cell data

### Phase 4: Unify desktop header and cell styling

Status: `completed`

Tasks:

1. Align header styling with `All`
2. Align row density and cell spacing with `All`
3. Align badge treatment with `All`
4. Remove remaining legacy visual leftovers

Completed:

- Kept the service desktop header styling on the shared records-table header style primitives introduced in the earlier shell migration
- Preserved compact row density through `records-table-compact` while normalizing centered numeric/status/action cells
- Migrated service status badges to the shared `records-status-badge` visual system used by `All`
- Switched service remarks cells to the compact remarks presentation used by the `All` desktop table
- Removed the remaining obvious legacy visual mismatch from the service desktop rows without changing service-specific data rendering

### Phase 5: Add footer/pagination parity

Status: `completed`

Tasks:

1. Add service-table rows-per-page handling
2. Add footer utility row
3. Add service-table paging state/UI parity

Completed:

- Added shared service-table page size and current-page state through `useServiceRecordsTableState.js`
- Added filtered-row paging calculations in `ServiceConfiguredRecordsTable.jsx`
- Replaced full filtered-row rendering with paged rendering in the shared configured service table path
- Wired the reusable `RecordsTableFooter.jsx` into `ServiceRecordsTableBase.jsx`
- Reused the same rows-per-page, showing-range, and prev/next footer utility model used by `All`
- Reused the footer ref path from `useTableViewportHeight.js` so service table viewport sizing now accounts for the new footer block

### Phase 6: Unify interaction behavior

Status: `completed`

Tasks:

1. Align row-click behavior with `All`
2. Align action-cell interaction model with `All`
3. Align copy-email, truncation, tooltip, and remarks behavior with `All`

Completed:

- Added default row-open behavior to the shared configured service table path, matching the `All` table interaction model
- Added keyboard row-open support (`Enter` / `Space`) for service table rows, matching the `All` desktop row interaction pattern
- Added the same row-open ignore guard used by `All` so buttons, dropdowns, inputs, remarks controls, and explicit no-row-open zones do not trigger detail open
- Prevented service email copy clicks from bubbling into row-open
- Prevented service action-cell clicks from bubbling into row-open and kept the full-cell action zone behavior intact
- Normalized the service row index to follow paged row numbering rather than restarting from `1` on every page

### Phase 7: Decide feature parity boundaries

Status: `completed`

Tasks:

1. Decide on service-table sort support
2. Decide on service-table CSV export support
3. Decide on service-table column chooser support
4. Apply only deliberate parity decisions

Completed:

- Adopted the same feature stance as `All`: service tables now include sorting, CSV export, and column visibility controls instead of deferring those decisions
- Added service-table column visibility configuration and per-service preference keys
- Generalized `useColumnPreferences.js` so the same persistence model can be reused by service tables with their own storage/API keys
- Added a dedicated service filter panel with the same top-row controls, advanced-filter count, active chips, reset path, desktop column chooser, and CSV export affordances used by `All`
- Added debounced search input behavior to service tables so they now follow the same search-input/search-term interaction model as `All`
- Added service-table sorting for the visible data columns and aligned the desktop headers to the same sort button pattern used by `All`
- Added CSV export for service tables based on the currently visible service-table columns

### Phase 8: Mobile parity

Status: `completed`

Tasks:

1. Decide whether service tabs adopt the `All` mobile list system
2. Implement mobile parity or explicitly defer it
3. Preserve manpower-specific mobile exceptions if needed

Completed:

- Adopted the same mobile card/list paradigm used by `All` for service tables instead of deferring mobile parity
- Added `tables/service/ServiceRecordsMobileList.jsx` as the shared mobile list renderer for service tables
- Updated `ServiceRecordsTableBase.jsx` to render the mobile list on sub-desktop breakpoints and hide the desktop table shell there
- Reused the same top mobile pager pattern and shared footer model used by `All`
- Preserved manpower-specific mobile behavior by adding an explicit mobile `See more` hook that still opens the manpower service-details modal
- Reused the shared action menu in mobile service cards so actions remain aligned with the desktop service table behavior

### Phase 9: Final regression verification

Status: `completed`

Tasks:

1. Verify desktop service tabs visually match the `All` system where intended
2. Verify filters, actions, pagination, and remarks behavior
3. Verify manpower special-case modal still works
4. Run lint
5. Run production build
6. Update docs if implementation references change

Completed:

- Ran full records-module lint successfully
- Re-ran frontend production build successfully after the final service-table mobile parity changes
- Re-checked the service-table registry path in `config/recordTables.js`
- Re-checked the records page integration path in `routes/RecordsPage.jsx`
- Re-checked the shared service desktop/mobile split in `tables/service/ServiceRecordsTableBase.jsx`
- Re-checked the shared configured service table orchestration in `tables/service/ServiceConfiguredRecordsTable.jsx`
- Re-checked the manpower special-case modal entry path in `tables/service/ManpowerRecordsTable.jsx`
- Confirmed no additional documentation path updates were required in `docs/ui/datatable-guidelines.md` for this pass

## Working Rules

1. UI migration should reuse `All` patterns, not duplicate them blindly.
2. Preserve service-specific data semantics while unifying the visual/interaction shell.
3. Avoid mixing structural refactor concerns into this pass unless necessary.
4. Keep each phase verifiable with lint/build after code changes begin.

## Update Log

- `2026-05-06`: Tracker created. Phase 1 completed by locking the `All`-table UI contract for service-table migration.
- `2026-05-06`: Phase 2 completed by extracting shared table UI style tokens and a reusable records table footer from the `All` table implementation.
- `2026-05-06`: Phase 3 completed by migrating `ServiceRecordsTableBase.jsx` onto the compact records-table shell with advanced-collapse filters, viewport scrolling, and sticky action-column behavior.
- `2026-05-06`: Phase 4 completed by aligning service-table desktop cell treatment with `All`, including shared status badge styling and compact remarks presentation.
- `2026-05-06`: Phase 5 completed by adding shared rows-per-page and pagination footer parity to the service-table path.
- `2026-05-06`: Phase 6 completed by aligning service-table row-open, keyboard, email-copy, and action-cell interaction behavior with the `All` table model.
- `2026-05-06`: Phase 7 completed by bringing service tables onto the same feature surface as `All`, including sort, CSV export, column chooser, filter chips, debounced search, and persisted column visibility.
- `2026-05-06`: Phase 8 completed by migrating service tables onto the shared mobile card/list paradigm and preserving manpower's mobile service-details affordance.
- `2026-05-06`: Phase 9 completed by finishing full records-module lint/build verification and closing the service-table UI unification workstream.
