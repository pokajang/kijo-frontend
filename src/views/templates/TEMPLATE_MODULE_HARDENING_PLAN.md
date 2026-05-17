# Template Module Hardening Plan

This plan starts after Phase 1, where shared template helpers were centralized in `shared/templateUtils.js`.

Use this file as the working reference for hardening `frontend/src/views/templates` phase by phase. Each phase should be implemented, audited, and verified before moving to the next one.

## Phase 2: Centralize Template API Calls

### Goal

Move direct template API calls behind one shared API layer so list, detail, create, update, delete, and PDF URL behavior is consistent across all template types.

### Tasks

1. Create `frontend/src/views/templates/shared/templateApi.js`.
2. Define supported template types:
   - `training`
   - `ih`
   - `manpower`
   - `special`
3. Add endpoint config per type:
   - list/get base URL
   - create URL
   - update URL or URL builder
   - delete URL or URL builder
   - PDF URL builder
4. Add shared request helper:
   - includes `credentials: 'include'`
   - supports `AbortSignal`
   - parses JSON safely
   - throws meaningful errors for non-2xx responses
   - preserves backend error messages where available
5. Add exported API methods:
   - `listTemplates(type, options)`
   - `getTemplate(type, id, options)`
   - `createTemplate(type, payload, options)`
   - `updateTemplate(type, id, payload, options)`
   - `deleteTemplate(type, id, options)`
   - `getTemplatePdfUrl(type, id)`
6. Support JSON payloads.
7. Support `FormData` payloads for special templates.
8. Refactor list pages to use `listTemplates` and `deleteTemplate`.
9. Refactor detail pages to use `getTemplate`, `deleteTemplate`, and `getTemplatePdfUrl`.
10. Refactor create/edit hooks to use `createTemplate`, `updateTemplate`, and `getTemplate`.
11. Keep compatibility with current backend routes and response shapes.

### Files Likely Touched

- `shared/templateApi.js`
- `shared/templateProposalUtils.js`
- `list-training/trainingTemplateUtils.js`
- `list-training/TrainingProposals.js`
- `list-training/TrainingProposalDetailPage.jsx`
- `list-ih/IhProposals.js`
- `list-manpower/ManpowerProposals.js`
- `list-special/SpecialProposals.js`
- `shared/TemplateProposalDetailPage.jsx`
- create/edit hooks under `create/*/useFormLogic.js`
- `create/TrainingServiceTemplate/actionHandlers.js`

### Acceptance Checks

- All four list pages load records.
- Detail pages load records by ID.
- Create works for all four types.
- Edit works for all four types.
- Delete works from list and detail pages.
- PDF export URLs still open.
- `npm run lint -- src/views/templates`
- `npm run build`

## Phase 3: Safer HTML Handling

### Goal

Replace regex-based sanitizing with a real HTML sanitizer and ensure stored rich text is rendered defensively.

### Tasks

1. Add `dompurify` if not already installed.
2. Update `shared/templateUtils.js` or create `shared/templateHtml.js`.
3. Replace `sanitizeDisplayHtml` internals with DOMPurify.
4. Define a strict allowlist:
   - `p`
   - `br`
   - `strong`
   - `b`
   - `em`
   - `i`
   - `u`
   - `ol`
   - `ul`
   - `li`
5. Decide whether tables are required. If yes, also allow:
   - `table`
   - `thead`
   - `tbody`
   - `tr`
   - `th`
   - `td`
6. Strip event handlers and inline scripts.
7. Strip unsafe URLs.
8. Apply sanitized rendering in:
   - `shared/TemplateProposalDetailPage.jsx`
   - `list-training/TrainingProposalDetailPage.jsx`
   - agenda topic rendering
9. Consider sanitizing before submit if the backend does not sanitize.
10. Add tests for allowed tags and blocked tags.

### Acceptance Checks

- TinyMCE formatting still renders correctly.
- `<script>` and event handlers are removed.
- Disallowed tags are removed without breaking text.
- Detail pages render safely.
- Sanitizer tests pass.
- `npm run build`

## Phase 4: Save and Loading State Hardening

### Goal

Prevent duplicate submissions and give clear feedback during create/update operations.

### Tasks

1. Add `saving` state to each create/edit flow.
2. Disable save button while saving.
3. Disable reset/cancel while saving if leaving mid-request would cause confusion.
4. Change button text while saving:
   - `Saving...`
   - `Updating...`
   - `Uploading...` for special upload mode
5. Ensure duplicate clicks cannot submit multiple requests.
6. Always reset `saving` in `finally`.
7. Add `saveError` state where errors are currently only logged.
8. Display save errors in a `CAlert`.
9. Keep confirmation dialogs only before the request starts.
10. Apply to:
    - training create/edit
    - IH create/edit
    - manpower create/edit
    - special create/edit

### Acceptance Checks

- Double-clicking save creates only one request.
- Save button is disabled during request.
- Errors display to the user.
- Successful create/update still navigates to the list page.
- Special upload cannot be double-submitted.

## Phase 5: Standardized Validation

### Goal

Make validation consistent, testable, and user-visible across all template types.

### Tasks

1. Create `shared/templateValidation.js`.
2. Add common validation helpers:
   - required string
   - required rich text with HTML stripped
   - max length where relevant
   - service/training code format if business rules require it
3. Add common template validation:
   - title required
   - code required
   - remarks required
4. Add training validation:
   - duration required
   - agenda rows are either fully empty or complete
   - start and end are required when topic exists
   - topic is required when time exists
   - start time must be before end time
5. Add IH validation:
   - at least one meaningful content section
   - title and code required
6. Add manpower validation:
   - title and code required
   - introduction or deliverables required
7. Add special validation:
   - proposal mode must be `upload` or `write`
   - upload mode requires service summary
   - upload mode requires attachment on create if business rules require it
   - write mode requires proposal content
8. Return structured errors:
   - `{ field, message }`
9. Render validation errors in a top-level alert or field-level messages.
10. Run validation before confirmation dialogs.
11. Add tests for each validator.

### Acceptance Checks

- Invalid forms do not open confirmation dialogs.
- Users see clear validation errors.
- Empty rich-text HTML does not count as content.
- Training agenda time validation catches bad rows.
- Validation tests pass.

## Phase 6: Edit-Mode Loading and Error UX

### Goal

Make edit pages reliable when records fail to load, are missing, or requests are aborted.

### Tasks

1. Add `loading` and `loadError` state to create/edit hooks.
2. Return these states from each hook.
3. Do not render editable fields until edit data has loaded.
4. Show a consistent loading indicator or message.
5. Show a consistent `CAlert` for load errors.
6. Handle "template not found" explicitly.
7. Use `AbortController` consistently for edit fetches.
8. Ensure aborted requests do not update state.
9. Apply to:
   - training edit loader
   - IH edit loader
   - manpower edit loader
   - special edit loader
10. Remove silent failures that only call `console.error`.

### Acceptance Checks

- Edit page shows loading state.
- Missing template shows a user-facing error.
- Network failure shows a user-facing error.
- Navigating away during load does not cause state update warnings.
- Successful edit load still populates all fields.

## Phase 7: Remove Browser-Back Reload Workaround

### Goal

Remove the `popstate` full-page reload from `CreateTemplate.js` and rely on React state management.

### Tasks

1. Remove the `window.addEventListener('popstate', ...)` reload effect.
2. Confirm `CurrentComponent` keys reset state correctly:
   - create mode key by type
   - edit mode key by edit ID
3. Confirm query param changes reset the visible form.
4. Confirm browser back/forward works between:
   - `/templates/create`
   - `/templates/create?type=training`
   - `/templates/create?type=ih`
   - edit URLs
5. Fix stale state with better keys or hook dependencies if needed.
6. Confirm drafts still restore only in create mode.

### Acceptance Checks

- Browser back no longer forces a full reload.
- Switching template type does not leak old form state.
- Edit pages load the correct record after navigation.
- Draft restore behavior is unchanged.

## Phase 8: API/UI Data Mappers

### Goal

Isolate backend naming differences from React form state and table/detail components.

### Tasks

1. Create mapper file or files:
   - `shared/templateMappers.js`
   - or one mapper per type
2. Add `fromApiTrainingTemplate(row)`.
3. Add `toApiTrainingTemplate(form)`.
4. Add `fromApiIhTemplate(row)`.
5. Add `toApiIhTemplate(form)`.
6. Add `fromApiManpowerTemplate(row)`.
7. Add `toApiManpowerTemplate(form)`.
8. Add `fromApiSpecialTemplate(row)`.
9. Add `toApiSpecialTemplate(form)`.
10. Normalize React state to camelCase.
11. Keep backend aliases only in mappers:
    - `id`
    - `template_id`
    - `proposal_id`
    - `training_title`
    - `trainingTitle`
    - `methodTheory`
    - `method_theory`
12. Refactor edit loaders to use `fromApi...`.
13. Refactor save handlers to use `toApi...`.
14. Refactor list/detail normalizers where appropriate.
15. Add mapper tests.

### Acceptance Checks

- Payloads sent to backend are unchanged where required.
- UI state is easier to read and consistent.
- Mapper tests cover legacy and current backend field names.
- Existing create/edit/list/detail behavior remains intact.

## Phase 9: Draft Persistence Hardening

### Goal

Make localStorage drafts versioned, type-safe, and recoverable.

### Tasks

1. Create draft helpers:
   - `readTemplateDraft(type)`
   - `writeTemplateDraft(type, payload)`
   - `clearTemplateDraft(type)`
2. Store drafts using schema:
   ```json
   {
     "version": 1,
     "type": "training",
     "savedAt": "2026-05-12T00:00:00.000Z",
     "payload": {}
   }
   ```
3. Use one draft version constant.
4. Ignore draft records with unsupported versions.
5. Ignore draft records with mismatched type.
6. Safely handle JSON parse failures.
7. Add optional expiry logic, such as ignoring drafts older than 30 days.
8. Keep edit mode from reading create drafts.
9. Show a small "Draft restored" message if useful.
10. Ensure reset clears the draft.
11. Add draft helper tests.

### Acceptance Checks

- Create mode restores valid drafts.
- Edit mode never restores drafts.
- Corrupt localStorage does not crash the page.
- Reset clears the correct draft.
- Old/incompatible drafts are ignored.

## Phase 10: Special Attachment Hardening

### Goal

Improve special proposal upload safety and user feedback.

### Tasks

1. Define accepted file types.
2. Define maximum file size.
3. Validate files on selection.
4. Display rejected files with reasons.
5. Prevent duplicate file selection where appropriate.
6. Validate custom attachment names:
   - non-empty after trim if provided
   - reasonable length
   - no path separators
7. Improve preview handling for unsupported file types.
8. Confirm existing attachment removal state is reliable.
9. Ensure upload mode sends only valid files.
10. Confirm backend enforces the same type and size rules.
11. Consider upload progress only if file sizes are large enough to justify it.

### Acceptance Checks

- Invalid file type is rejected before submit.
- Oversized file is rejected before submit.
- Rejected file reason is visible.
- Existing attachments can be removed during edit.
- New valid attachments upload successfully.
- Written proposal mode does not send files.

## Phase 11: Refactor Duplicate Form Logic

### Goal

Reduce repeated create/edit hook logic after behavior is protected by tests and helper layers.

### Tasks

1. Identify common behavior:
   - draft load
   - auto-save
   - edit load
   - remarks
   - history
   - save
   - reset
   - validation
   - loading state
   - saving state
   - errors
2. Create a reusable hook for JSON-backed templates, likely:
   - `useJsonTemplateForm`
3. Apply it first to manpower because it has the simplest shape.
4. Apply it to IH next.
5. Keep special custom for attachments but reuse shared API, validation, and draft helpers.
6. Keep training custom where agenda/duration logic warrants it.
7. Remove dead helper code only after each type is verified.
8. Keep UI components stable unless the refactor requires prop changes.

### Acceptance Checks

- Manpower create/edit behavior is unchanged after refactor.
- IH create/edit behavior is unchanged after refactor.
- Special and training continue working.
- Duplicate logic is meaningfully reduced.
- Tests and build pass.

## Phase 12: Tests

### Goal

Add targeted automated coverage for the risky template behavior.

### Tasks

1. Keep utility tests for `templateUtils`.
2. Add API wrapper tests with mocked `fetch`.
3. Add mapper tests:
   - API to UI state
   - UI state to API payload
4. Add validation tests:
   - missing title
   - missing code
   - missing remarks
   - empty rich text
   - invalid training agenda time
   - special upload/write mode rules
5. Add draft tests:
   - valid draft
   - corrupt draft
   - wrong type
   - old version
   - clear draft
6. Add component tests only where useful:
   - save button disables while saving
   - validation errors render
   - edit load error renders
7. Avoid broad brittle UI snapshots.

### Acceptance Checks

- `npm run test:run` passes.
- Tests cover helpers that future phases depend on.
- Test failures point to useful behavior, not implementation details.

## Phase 13: Manual Regression Checklist

### Goal

Verify the full user workflow after hardening changes.

### Checklist

1. Create training template.
2. Edit training template.
3. Delete training template from list.
4. Delete training template from detail.
5. Export training PDF.
6. Create IH template.
7. Edit IH template.
8. Delete IH template from list.
9. Delete IH template from detail.
10. Export IH PDF.
11. Create manpower template.
12. Edit manpower template.
13. Delete manpower template from list.
14. Delete manpower template from detail.
15. Export manpower PDF.
16. Create special template in upload mode.
17. Edit special upload attachments.
18. Remove an existing special attachment.
19. Create special template in write mode.
20. Edit special written content.
21. Delete special template from list.
22. Delete special template from detail.
23. Export special PDF.
24. Confirm CRM quote screens still load template lists:
    - training quote topic selector
    - IH service selector
    - manpower selector
    - special selector
25. Confirm browser back/forward on `/templates/create` works.
26. Confirm draft restore works in create mode.
27. Confirm reset clears drafts.
28. Confirm edit mode does not restore drafts.
29. Confirm failed network requests show user-facing errors.
30. Confirm build passes.

## Recommended Execution Order

1. Phase 2: Centralize Template API Calls
2. Phase 4: Save and Loading State Hardening
3. Phase 5: Standardized Validation
4. Phase 6: Edit-Mode Loading and Error UX
5. Phase 7: Remove Browser-Back Reload Workaround
6. Phase 3: Safer HTML Handling
7. Phase 8: API/UI Data Mappers
8. Phase 9: Draft Persistence Hardening
9. Phase 10: Special Attachment Hardening
10. Phase 11: Refactor Duplicate Form Logic
11. Phase 12: Tests
12. Phase 13: Manual Regression Checklist

The order intentionally delays larger refactors until the API layer, validation, and loading behavior are stable.
