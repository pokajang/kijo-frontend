# Upgrading Project Management

This document breaks the Project Management upgrade work into phased tasks. The intent is to improve the architecture around `manage/ManageProject.js`, `manage/ProjectTable.jsx`, `manage/ManageProjectPage.jsx`, and related API/action modules without changing user-facing behavior all at once.

## Current Shape

`manage/ManageProject.js` is a container for the project list page. It owns list loading, period range state, delete refresh behavior, close modal orchestration, and navigation into project detail and commercial create pages.

The heavier responsibilities are currently spread across these files:

- `manage/ProjectTable.jsx`: table UI, filters, row normalization, stats, action definitions, mobile record config, column config.
- `manage/ManageProjectPage.jsx`: detail page loading, finance loading, project actions, close/delete behavior.
- `manage/projectApi.js`: shared project API functions and response normalizers.
- `manage/actionHandlers.js`: delete handler, list alias, status badge color.
- `manage/CloseProjectModal.jsx`: close/terminate form and direct close API request.
- `manage/projectFilters.js`: list filtering helpers, project owner detection, latest progress update helpers.

The system works, but action logic, status logic, and API conventions are not consistently centralized.

## Target Architecture

Project Management should move toward this shape:

- Page containers own orchestration only: loading, routing, local modal state, refresh callbacks.
- Shared project status rules live in one module.
- Shared project action construction lives in one module.
- All project API calls go through `projectApi.js` and `requestJson`.
- Table-specific transformation, columns, and statistics are isolated from the table component.
- Tests cover page orchestration, action routing, close/delete behavior, filters, and API contracts.

## Phase 1: Stabilize List Loading - Done

### Goal

Prevent stale project list requests from overwriting newer data when users change period filters quickly or navigate away during loading.

### Tasks

- Update `manage/ManageProject.js` so `loadProjects` supports request cancellation.
- Use `AbortController` inside the `useEffect` that triggers project loading.
- Pass `{ signal, periodRange }` into `fetchProjects`.
- Ignore `AbortError` in the catch path.
- Keep current alert behavior for real failures.
- Keep current default period range behavior: `getPeriodRangePreset('ytd')`.

### Candidate Implementation Notes

- Prefer an effect-local controller:

```jsx
useEffect(() => {
  const controller = new AbortController()
  loadProjects({ signal: controller.signal })
  return () => controller.abort()
}, [loadProjects])
```

- Change `loadProjects` to accept an options object while still closing over `periodRange`.
- Avoid showing an alert when a request is intentionally aborted.

### Acceptance Criteria

- Changing period range rapidly does not allow an older response to replace newer results.
- Navigating away during loading does not produce state update warnings.
- Existing project list load and error behavior remains intact.

### Completion Notes

- Implemented request cancellation with `AbortController`.
- Added latest-request guarding in `manage/ManageProject.js`.
- Abort failures are ignored without clearing projects or alerting the user.
- Real load failures still clear projects and alert the user.
- Covered with `manage/ManageProject.test.jsx`.

### Test Targets

- Add or extend `manage/ManageProject.test.jsx`.
- Assert `fetchProjects` receives a `signal`.
- Assert abort errors do not call `dialog.alert`.
- Assert real fetch errors still clear the list and alert the user.

## Phase 2: Centralize Project Status Rules - Done

### Goal

Remove duplicated status normalization, close-state detection, badge colors, and close type constants.

### Tasks

- Create `manage/projectStatus.js`.
- Move these concepts into that module:
  - `PROJECT_STATUSES`
  - `PROJECT_CLOSE_TYPES`
  - `normalizeProjectStatus`
  - `isClosedProject`
  - `getProjectStatusTone`
  - `isProjectActive`
  - `shouldIncludeProjectValue`
- Replace local copies in:
  - `manage/ProjectTable.jsx`
  - `manage/ManageProjectPage.jsx`
  - `manage/actionHandlers.js`
  - `manage/CloseProjectModal.jsx`

### Consistency Rules

- Normalize status comparisons with lowercase trimmed strings.
- Accept current display values such as `Active`, `Completed`, `Terminated`, and `Closed`.
- Keep display labels unchanged unless the backend contract is updated.
- Ensure lowercase payload values from APIs still map to correct UI tones.

### Acceptance Criteria

- Closed action rules are identical on list and detail pages.
- Status badge colors are identical on list and detail contexts.
- `Terminated` and lowercase `terminated` both resolve to danger styling.
- `Completed` and lowercase `completed` both resolve to success styling.

### Completion Notes

- Added `manage/projectStatus.js`.
- Replaced duplicated status logic in `ProjectTable.jsx`, `ManageProjectPage.jsx`, `CloseProjectModal.jsx`, and `actionHandlers.js`.
- Kept `getBadgeColor` exported from `actionHandlers.js` for compatibility.
- Covered with `manage/__tests__/projectStatus.test.js`.

### Test Targets

- Add `manage/__tests__/projectStatus.test.js`.
- Cover casing, whitespace, unknown statuses, closed detection, active detection, and value inclusion.

## Phase 3: Move Close API Into `projectApi.js` - Done

### Goal

Use one API layer for project operations instead of direct `fetch` calls inside UI components.

### Tasks

- Add `closeProject(projectId, payload)` to `manage/projectApi.js`.
- Implement it through `requestJson`.
- Normalize success/error response handling consistently with existing API conventions.
- Update `manage/CloseProjectModal.jsx` to call `closeProject`.
- Keep modal validation, confirmation dialog, and success messages in the modal for now.

### Candidate API Shape

```js
export const closeProject = (projectId, payload) =>
  requestJson(`projects/${enc(projectId)}/close`, {
    method: 'POST',
    body: payload,
  })
```

### Acceptance Criteria

- Close and terminate requests use `credentials: 'include'` through `requestJson`.
- Non-2xx responses use standard `requestJson` error handling.
- The modal no longer builds API URLs directly.
- Existing success messages remain unchanged.

### Completion Notes

- Added `closeProject(projectId, payload)` to `manage/projectApi.js`.
- Updated `CloseProjectModal.jsx` to call `closeProject`.
- Preserved close/terminate validation, confirmation, success alerts, and error alerts.
- Covered with `manage/__tests__/projectApi.test.js` and `manage/CloseProjectModal.test.jsx`.

### Test Targets

- Extend `manage/__tests__/projectApi.test.js`.
- Assert `closeProject` posts to `projects/:id/close`.
- Assert the body includes `project_id`, `closeDate`, `closeType`, `reason`, and checks.
- Add or extend modal tests if a test harness already exists for CoreUI modals.

## Phase 4: Extract Shared Project Actions - Done

### Goal

Keep list-page and detail-page actions in sync by generating action definitions from one source.

### Tasks

- Create `manage/projectActions.js`.
- Add a helper such as `buildProjectActions`.
- Inputs should include:
  - `project`
  - `onGenerateCommercialDocument`
  - `onCompleteProject`
  - `onTerminateProject`
  - `onDeleteProject`
  - `deleting`
  - optional UI mode flags for table/detail differences
- Generate these actions centrally:
  - Generate JD14
  - Generate Invoice
  - Generate DO
  - Create Vendor LOA
  - Create Supplier PO
  - Complete Project
  - Terminate Project
  - Delete Project

### Behavioral Rules

- Show JD14 only for `Training` projects unless product rules change.
- Disable complete and terminate for completed, terminated, or closed projects.
- Delete should expose disabled/loading metadata when a delete is in progress.
- Keep dangerous styling for terminate and delete.

### Migration Steps

- Replace `getActions` inside `manage/ProjectTable.jsx`.
- Replace `projectActions` construction inside `manage/ManageProjectPage.jsx`.
- Keep adapter callbacks local to each page, because navigation and refresh differ by page.

### Acceptance Criteria

- List and detail pages expose the same project actions.
- Route generation remains unchanged:
  - `/commercial/invoice/create/:projectId`
  - `/commercial/delivery-order/create/:projectId`
  - `/commercial/jd14/create/:projectId`
  - `/commercial/vendor-loa/create/:projectId`
  - `/commercial/supplier-po/create/:projectId`
- Delete loading is reflected in both list and detail contexts.

### Completion Notes

- Added `manage/projectActions.js`.
- Added `buildProjectActions`.
- Replaced duplicated action arrays in `ProjectTable.jsx` and `ManageProjectPage.jsx`.
- Preserved action labels, ordering, commercial routes, closed-project disabling, and danger styling.
- Covered with `manage/__tests__/projectActions.test.js` and expanded `manage/ManageProject.test.jsx`.

### Test Targets

- Add `manage/__tests__/projectActions.test.js`.
- Cover training vs non-training JD14 visibility.
- Cover closed project disabled rules.
- Cover delete loading metadata.
- Extend `manage/ManageProject.test.jsx` to cover all commercial create routes, not only Vendor LOA and Supplier PO.

## Phase 5: Split `ProjectTable.jsx` - Done

### Goal

Reduce `ProjectTable.jsx` from a large mixed-responsibility component into smaller, testable modules.

### Tasks

- Create `manage/projectTableColumns.js`.
- Move table constants:
  - `columnStorageKey`
  - `actionColumnWidth`
  - `defaultVisibleColumns`
  - `requiredColumns`
  - `dataColumns`
- Create `manage/projectTableRows.js`.
- Move row normalization helpers:
  - empty display value handling
  - vendor display text
  - latest update display text
  - amount display text
  - award and closed date display text
- Create `manage/projectTableStats.js`.
- Move stats calculation:
  - total value
  - active count
  - needs update
  - top leader
- Keep UI-only components in `ProjectTable.jsx` unless they become independently reused.

### Acceptance Criteria

- `ProjectTable.jsx` mostly contains React state, memo wiring, filters, and render functions.
- Row transformation and stats can be tested without rendering React.
- Existing table appearance, filters, sorting, export fields, and mobile records remain unchanged.

### Completion Notes

- Added `manage/projectTableColumns.js` for table constants.
- Added `manage/projectTableRows.js` for row normalization.
- Added `manage/projectTableStats.js` for overview stat calculation.
- Kept `ProjectUpdateCell`, filter state, render functions, and `DataTableRecordList` wiring in `ProjectTable.jsx`.
- Preserved table labels, sorting, export filename, visible-column storage key, and mobile record shape.
- Covered with `manage/__tests__/projectTableRows.test.js` and `manage/__tests__/projectTableStats.test.js`.

### Test Targets

- Add tests for row normalization.
- Add tests for stats calculation.
- Keep existing datatable behavior unchanged.

## Phase 6: Tighten Delete Flow - Done

### Goal

Make delete behavior explicit, consistent, and visible to users.

### Tasks

- Pass `deletingProjectId` from `ManageProject.js` into `ProjectTable`.
- Feed delete loading state into shared project action generation.
- Disable delete actions while any delete is in progress, or only disable the matching row if row-specific action rendering supports it.
- Keep the current guard in `ManageProject.js` to prevent double submissions.

### Acceptance Criteria

- Clicking delete repeatedly cannot trigger multiple delete requests.
- The UI shows a deleting state or disables delete while the request is pending.
- Successful delete refreshes the project list.
- Cancelled delete confirmation does not refresh the list.

### Completion Notes

- Passed `deletingProjectId` from `ManageProject.js` into `ProjectTable.jsx`.
- Fed delete state into `buildProjectActions`.
- Hardened the duplicate-delete guard with an internal ref in `ManageProject.js`.
- Preserved successful delete refresh and cancelled delete no-refresh behavior.
- Covered with expanded `manage/ManageProject.test.jsx`.

### Test Targets

- Extend `manage/ManageProject.test.jsx`.
- Mock `handleDeleteProject`.
- Assert duplicate delete clicks are guarded.
- Assert successful delete calls `fetchProjects` again.

## Phase 7: Improve Date Safety - Done

### Goal

Avoid UTC date drift in close/terminate defaults.

### Tasks

- Replace `new Date().toISOString().split('T')[0]` in `CloseProjectModal.jsx`.
- Use a local date formatter shared from the period/date utilities if available.
- If no suitable helper exists, add a small local helper and test it.

### Acceptance Criteria

- Closing date defaults to the user's local calendar date.
- Asia/Singapore midnight and early-morning usage does not produce the previous UTC date.
- Existing payload format stays `YYYY-MM-DD`.

### Completion Notes

- Updated `manage/CloseProjectModal.jsx` to use `formatLocalDate(new Date())`.
- Removed the UTC-based close-date default from the close/terminate modal.
- Preserved close payload shape, validation, confirmation, success alerts, and error alerts.
- Covered local date default behavior in `manage/CloseProjectModal.test.jsx`.

### Test Targets

- Unit test the date formatter if extracted.
- Modal test may assert the default field value when feasible.

## Phase 8: Canonical Route and Navigation Cleanup - Done

### Goal

Make project detail routes more predictable while preserving backward compatibility.

### Tasks

- Review `ManageProjectPage.jsx` route canonicalization.
- Current behavior redirects `/project/manage/:id` to the slugged route, but does not replace stale slugs.
- Decide whether stale slugs should be replaced automatically.
- Extract route builders if action extraction does not already cover them:
  - `getProjectManagePath(project)`
  - `getCommercialCreatePath(type, projectId)`

### Acceptance Criteria

- List page and detail page use the same route builders.
- Backward-compatible `/project/manage/:id` remains supported.
- Stale slug handling is intentional and tested.

### Completion Notes

- Added `manage/projectRoutes.js`.
- Added `getProjectManagePath`, `getCommercialCreatePath`, and `isProjectManagePathCanonical`.
- Replaced inline project detail and commercial create route construction in `ManageProject.js` and `ManageProjectPage.jsx`.
- Updated detail-page canonicalization so missing or stale slugs are replaced with the canonical slug route.
- Added background detail refresh for route-state projects so stale browser state cannot make stale slugs look canonical.
- Preserved route state, backward-compatible `/project/manage/:id`, and existing commercial create route shapes.
- Covered route helper behavior in `manage/__tests__/projectRoutes.test.js`.
- Covered detail-page missing and stale slug redirects in `manage/ManageProjectPage.test.jsx`.

### Test Targets

- Add route builder unit tests.
- Add detail page test for `/project/manage/:id` redirect if existing test setup supports routing.

## Phase 9: Broaden Regression Tests - Done

### Goal

Protect the refactor with behavior-focused tests.

### Priority Test Coverage

- `ManageProject.js`
  - initial load uses YTD period
  - period changes reload projects
  - abort errors do not alert
  - real errors alert and clear rows
  - commercial create routes for all document types
  - close confirm refreshes list
  - delete success refreshes list

- `ProjectTable.jsx` extracted modules
  - filters and period scoping
  - row normalization
  - stats calculation
  - action generation

- `projectApi.js`
  - `listProjects` current year default
  - all-time unbounded load
  - cross-year load
  - close project API
  - delete project API

- `CloseProjectModal.jsx`
  - completed requires all checks and remarks
  - terminated requires remarks only
  - submit calls `closeProject`
  - submit disables duplicate clicks

### Completion Notes

- Expanded `manage/CloseProjectModal.test.jsx` for local date defaults, validation rules, project API submit behavior, and duplicate-submit guarding.
- Expanded `manage/ManageProject.test.jsx` for canonical manage navigation and close-confirm refresh behavior.
- Added `manage/ManageProjectPage.test.jsx` for detail-page canonical redirect behavior.
- Added `manage/__tests__/projectRoutes.test.js` for route builder and canonical slug behavior.
- Added `manage/__tests__/projectFilters.test.js` for search, status, type, owner, vendor, update, amount, year, ownership, options, and latest-update behavior.
- Expanded `manage/__tests__/projectApi.test.js` for project delete and project LOA URL coverage.
- Hardened close/terminate duplicate-submit guarding during confirmation and request submission.
- Re-ran the project-management focused regression suite successfully.

## Suggested Delivery Order

1. Phase 1: request cancellation.
2. Phase 2: project status module.
3. Phase 3: close API extraction.
4. Phase 4: shared project actions.
5. Phase 6: delete loading state. Done.
6. Phase 5: split `ProjectTable.jsx`. Done.
7. Phase 7: local date safety.
8. Phase 8: route cleanup.
9. Phase 9: broader regression tests.

This order keeps early changes small and behavior-preserving, then moves into larger component decomposition after the shared contracts are stable.

## Risk Notes

- `ProjectTable.jsx` has many user-facing table behaviors. Split it only after tests cover row normalization, stats, actions, and route callbacks.
- `listProjects` intentionally combines API year scoping with client-side exact date filtering. Keep this contract unless the backend adds first-class date range support.
- Status casing may vary between backend payloads and UI labels. Normalize for comparisons, but preserve display values.
- Commercial document routes are now shared across list and detail flows. Keep route builders centralized once introduced.
- Do not change delete or close backend semantics during this frontend cleanup.

## Definition of Done

- Project list and project detail pages show the same available project actions.
- All project API calls are routed through `projectApi.js`.
- Project status and close-state rules are defined once.
- Stale list responses cannot overwrite current period results.
- Delete and close flows have visible pending states and duplicate-submit guards.
- Table transformation and statistics logic are testable without rendering the full table.
- Existing routes and user workflows remain backward compatible.
