import React from 'react'
import { CButton } from '@coreui/react'

const TemplateFormActions = ({
  isEdit,
  saving,
  finalizingBmTranslation = false,
  onSecondary,
  onSave,
  draftMessage = '',
}) => {
  const saveLabel = saving
    ? finalizingBmTranslation
      ? 'Saving BM proposal...'
      : 'Saving...'
    : finalizingBmTranslation
      ? 'Save and make available'
      : isEdit
        ? 'Save changes'
        : 'Save template'

  return (
    <div
      className="template-form-actions position-sticky bottom-0 bg-body border-top mt-4 py-3 d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2"
      style={{ zIndex: 5 }}
    >
      <small className="text-muted" role="status">
        {draftMessage}
      </small>
      <div className="template-form-action-buttons d-flex justify-content-end gap-2">
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={onSecondary}
          disabled={saving}
        >
          {isEdit ? 'Cancel' : 'Reset'}
        </CButton>
        <CButton color="primary" size="sm" onClick={onSave} disabled={saving}>
          {saveLabel}
        </CButton>
      </div>
    </div>
  )
}

export default TemplateFormActions
