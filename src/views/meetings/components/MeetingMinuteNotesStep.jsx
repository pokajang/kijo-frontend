import React from 'react'
import Editor from '../../../components/forms/ThemedTinyMCEEditor'
import CIcon from '@coreui/icons-react'
import { cilTrash } from '@coreui/icons'
import { CButton, CCol, CFormInput, CFormLabel, CFormSelect, CRow } from '@coreui/react'

const AGENDA_EDITOR_INIT = {
  license_key: 'gpl',
  height: 250,
  menubar: 'format',
  branding: false,
  promotion: false,
  toolbar_mode: 'wrap',
  block_formats:
    'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Heading 6=h6; Preformatted=pre',
  plugins: 'advlist lists link table code',
  toolbar:
    'undo redo | formatselect | bold italic underline | bullist numlist | alignleft aligncenter alignright alignjustify | link table | code',
}

const MINUTES_EDITOR_INIT = {
  ...AGENDA_EDITOR_INIT,
  height: 280,
}

export default function MeetingMinuteNotesStep({
  form,
  validationErrors = {},
  isFormLocked,
  staff,
  onChangeField,
  onAddActionItem,
  onActionItemChange,
  onRemoveActionItem,
}) {
  return (
    <>
      <CRow className="mb-3">
        <CCol xs={12}>
          <CFormLabel>Agenda</CFormLabel>
          <Editor
            tinymceScriptSrc="/tinymce/tinymce.min.js"
            value={form.agenda}
            init={AGENDA_EDITOR_INIT}
            disabled={isFormLocked}
            onEditorChange={(content) => onChangeField('agenda', content)}
          />
        </CCol>
      </CRow>

      <CRow className="mb-3">
        <CCol xs={12}>
          <CFormLabel>Minutes (Required)</CFormLabel>
          <div
            id="meetingMinutesEditor"
            className={validationErrors.minutesText ? 'meeting-editor-invalid' : ''}
            tabIndex={-1}
          >
            <Editor
              tinymceScriptSrc="/tinymce/tinymce.min.js"
              value={form.minutesText}
              init={MINUTES_EDITOR_INIT}
              disabled={isFormLocked}
              onEditorChange={(content) => onChangeField('minutesText', content)}
            />
          </div>
          {validationErrors.minutesText && (
            <div className="invalid-feedback d-block">{validationErrors.minutesText}</div>
          )}
        </CCol>
      </CRow>

      <CRow className="mb-3">
        <CCol xs={12}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <CFormLabel className="mb-0">Action Items</CFormLabel>
            <CButton
              type="button"
              size="sm"
              color="primary"
              onClick={onAddActionItem}
              disabled={isFormLocked}
            >
              Add Action
            </CButton>
          </div>

          {(form.actionItems || []).length === 0 ? (
            <div className="text-muted small">No action items added.</div>
          ) : (
            (form.actionItems || []).map((item, idx) => (
              <CRow className="g-2 mb-2 align-items-end" key={`action-item-${idx}`}>
                <CCol xs={12} md={6}>
                  <CFormLabel htmlFor={`action-text-${idx}`}>Action</CFormLabel>
                  <CFormInput
                    id={`action-text-${idx}`}
                    value={item.actionText}
                    onChange={(e) => onActionItemChange(idx, 'actionText', e.target.value)}
                    placeholder="Follow-up action"
                    disabled={isFormLocked}
                    invalid={Boolean(validationErrors[`actionItems.${idx}.actionText`])}
                    feedbackInvalid={validationErrors[`actionItems.${idx}.actionText`]}
                  />
                </CCol>
                <CCol xs={12} sm={6} md={3}>
                  <CFormLabel htmlFor={`action-pic-${idx}`}>Assign PIC</CFormLabel>
                  <CFormSelect
                    id={`action-pic-${idx}`}
                    value={item.picStaffId}
                    onChange={(e) => onActionItemChange(idx, 'picStaffId', e.target.value)}
                    disabled={isFormLocked}
                  >
                    <option value="">Select PIC</option>
                    {staff.map((member) => {
                      const id = Number(member.staff_id)
                      return (
                        <option key={`action-pic-opt-${id}`} value={id}>
                          {member.full_name || '-'} ({member.name_code || '-'})
                        </option>
                      )
                    })}
                  </CFormSelect>
                </CCol>
                <CCol xs={9} sm={4} md={2}>
                  <CFormLabel htmlFor={`action-due-${idx}`}>Due Date</CFormLabel>
                  <CFormInput
                    id={`action-due-${idx}`}
                    type="date"
                    value={item.dueDate}
                    onChange={(e) => onActionItemChange(idx, 'dueDate', e.target.value)}
                    disabled={isFormLocked}
                  />
                </CCol>
                <CCol xs="auto" className="ms-auto d-flex justify-content-end">
                  <CButton
                    type="button"
                    color="danger"
                    variant="outline"
                    size="sm"
                    className="d-inline-flex align-items-center justify-content-center px-3"
                    onClick={() => onRemoveActionItem(idx)}
                    disabled={isFormLocked}
                    aria-label="Remove action item"
                    title="Remove action item"
                  >
                    <CIcon icon={cilTrash} />
                  </CButton>
                </CCol>
              </CRow>
            ))
          )}
        </CCol>
      </CRow>
    </>
  )
}
