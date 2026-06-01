# Action Button Design Language

This guide standardizes action buttons used in forms, modals, drawers, cards, and workflow screens.

## Core Rule

All action buttons use small sizing.

- CoreUI: `size="sm"`
- Bootstrap class buttons: `.btn-sm`
- Icon-only action buttons should match small button height and use a stable square hit area.

## Placement

Primary form actions should appear at the end of the form, right-aligned.

Preferred containers:

- Modal forms: `CModalFooter`
- Card/page forms: `CCardFooter className="d-flex justify-content-end gap-2"`
- Inline forms without a footer: `div className="d-flex justify-content-end gap-2 flex-wrap"`
- Sticky long-form actions: right-aligned action bar at the bottom of the form area

Avoid placing final submit actions body-left unless the form is a compact inline editor where all controls are already inline.

## Button Order

Use this order from left to right:

1. Low-risk secondary actions: Back, Cancel, Reset, Clear
2. Secondary workflow actions: Save Draft, Preview, Download
3. Destructive actions, when paired with submit: Delete, Reject, Remove
4. Primary submit action: Save, Create, Submit, Confirm

The final primary action should be the rightmost button in the group.

## Color and Variant

Use color to communicate intent, not visual preference.

| Intent | Color / Variant | Examples |
| --- | --- | --- |
| Final submit, create, save, confirm | `color="primary"` | Save Changes, Create Invoice, Submit Report |
| Cancel, back, reset, clear | `color="secondary" variant="outline"` | Cancel, Back to Edit, Reset |
| Secondary non-submit workflow | `color="secondary" variant="outline"` | Save Draft, Preview, Export |
| Quiet helper action | `color="secondary" variant="ghost"` | Open Gmail Draft, Preview PDF inside a multi-action modal |
| Destructive final confirmation | `color="danger"` | Delete, Confirm Failure, Reject |
| Destructive secondary/row action | `color="danger" variant="outline"` or icon-only danger | Remove Item, Discard Draft |
| Positive status transition | `color="success"` | Mark Awarded, Confirm Success |
| Warning/exception request | `color="warning"` | Request Override |

Do not use solid secondary for cancel/back/reset actions. Those actions should be secondary outline.

Do not use `primary outline` for final save/submit/create actions. If the action commits user input, use solid primary.

## Labels

Button labels should describe the action that will happen.

- Use `Reset` only when fields are cleared or restored.
- Use `Cancel` when the user exits a modal/form without saving.
- Use `Back` or `Back to Edit` for navigation to a previous step.
- Use `Delete`, `Reject`, `Confirm Failure`, or `Discard` for destructive actions.
- Avoid labeling a reset behavior as `Cancel`.

## Form Patterns

Create/edit form footer:

```jsx
<CCardFooter className="d-flex justify-content-end gap-2">
  <CButton color="secondary" variant="outline" size="sm" onClick={onCancel}>
    Cancel
  </CButton>
  <CButton color="primary" size="sm" onClick={onSave} disabled={saving}>
    {saving ? 'Saving...' : 'Save Changes'}
  </CButton>
</CCardFooter>
```

Review step footer:

```jsx
<CCardFooter className="d-flex justify-content-end gap-2">
  <CButton color="secondary" variant="outline" size="sm" onClick={onBack}>
    Back to Edit
  </CButton>
  <CButton color="primary" size="sm" onClick={onConfirm} disabled={submitting}>
    {submitting ? 'Creating...' : 'Create'}
  </CButton>
</CCardFooter>
```

Destructive confirmation modal:

```jsx
<CModalFooter>
  <CButton color="secondary" variant="outline" size="sm" onClick={onCancel}>
    Cancel
  </CButton>
  <CButton color="danger" size="sm" onClick={onConfirm} disabled={submitting}>
    {submitting ? 'Deleting...' : 'Delete'}
  </CButton>
</CModalFooter>
```

## Exceptions

Inline row actions may use icon-only buttons when the row already has dense controls. They still need clear intent:

- Edit: neutral/secondary
- Remove/delete: danger
- Add: primary outline or primary, depending on whether it immediately commits

If an action only opens an add row or reveals more fields, prefer `primary outline`. If it commits the new row, use solid primary.
