import React from 'react'
import { CCol, CFormInput, CFormLabel, CRow } from '@coreui/react'
import {
  AttachmentInput,
  ClaimDraftActions,
  FormPanelHeading,
} from '../../claim-ui/ClaimFormPrimitives'

const MoneyClaimEditor = ({
  idPrefix,
  title,
  formData,
  fieldPrefix,
  placeholder,
  attachmentOptional = false,
  showDraft,
  addAction,
  attachmentInputVersion,
  isPreparing,
  onChange,
  onAttachmentChange,
  onSave,
  onCancel,
}) => {
  const headingId = `${idPrefix}Heading`
  const dateField = `${fieldPrefix}Date`
  const descriptionField = `${fieldPrefix}Description`
  const amountField = `${fieldPrefix}Amount`
  const attachmentField = `${fieldPrefix}Attachment`

  return (
    <section className="salary-adjustment-input-panel mt-3" aria-labelledby={headingId}>
      <FormPanelHeading id={headingId} title={title} action={addAction} />
      {showDraft && (
        <>
          <CRow className="g-3 salary-claim-field-row">
            <CCol xs={12} md="auto" className="salary-claim-date-col">
              <CFormLabel htmlFor={`${idPrefix}Date`} className="mb-1">
                Date
              </CFormLabel>
              <CFormInput
                id={`${idPrefix}Date`}
                type="date"
                name={dateField}
                value={formData[dateField]}
                onChange={onChange}
              />
            </CCol>
            <CCol xs={12} md className="salary-claim-grow-col">
              <CFormLabel htmlFor={`${idPrefix}Description`} className="mb-1">
                Description
              </CFormLabel>
              <CFormInput
                id={`${idPrefix}Description`}
                name={descriptionField}
                value={formData[descriptionField]}
                onChange={onChange}
                placeholder={placeholder}
              />
            </CCol>
            <CCol xs={12} md="auto" className="salary-claim-amount-col">
              <CFormLabel htmlFor={`${idPrefix}Amount`} className="mb-1">
                Amount
              </CFormLabel>
              <CFormInput
                id={`${idPrefix}Amount`}
                type="number"
                min="0"
                step="0.01"
                name={amountField}
                value={formData[amountField]}
                onChange={onChange}
              />
            </CCol>
            <CCol xs={12} md className="salary-claim-attachment-col">
              <AttachmentInput
                id={`${idPrefix}Attachment`}
                label={attachmentOptional ? 'Attachment (optional)' : 'Attachment'}
                attachment={formData[attachmentField]}
                inputKey={`${idPrefix}-${attachmentInputVersion}`}
                isPreparing={isPreparing}
                onChange={onAttachmentChange}
              />
            </CCol>
          </CRow>
          <ClaimDraftActions onSave={onSave} onCancel={onCancel} isPreparing={isPreparing} />
        </>
      )}
    </section>
  )
}

export default MoneyClaimEditor
