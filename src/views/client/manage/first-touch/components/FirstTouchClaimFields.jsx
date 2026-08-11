import React from 'react'
import {
  CAlert,
  CButton,
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import Select from '../../../../../components/forms/ThemedSelect'
import StaffSelect from '../../../../../components/forms/StaffSelect'
import FirstTouchEvidenceEditor from './FirstTouchEvidenceEditor'

const contactContextOptions = [
  {
    value: 'contact-mode:shared',
    label: 'Shared or automated Amiosh channel',
    contactMode: 'shared',
  },
  {
    value: 'contact-mode:unknown',
    label: 'Staff member not known',
    contactMode: 'unknown',
  },
]

const FirstTouchClaimFields = ({
  form,
  mode,
  todayDate,
  errorField,
  getErrorId,
  sourceOptions,
  selectedSource,
  selectPortalTarget,
  existingFirstTouch,
  sameDayAsCurrentClaim,
  staffOptions,
  inquiryOptions,
  sourceContact,
  sourceContactRawContext,
  sourceContactContext,
  proofs,
  evidenceBusy,
  onFormChange,
  onEncounterDateChange,
  onSourceContactChange,
  onEmploymentBoundaryChange,
  onAddEvidence,
  onReplaceEvidence,
  onRemoveEvidence,
}) => (
  <CRow className="g-3">
    <CCol xs={12} md={4}>
      <CFormLabel htmlFor="first-touch-date">Encounter date</CFormLabel>
      <CFormInput
        id="first-touch-date"
        type="date"
        max={todayDate}
        value={form.occurredAt}
        onChange={(event) => onEncounterDateChange(event.target.value)}
        invalid={errorField === 'date'}
        aria-describedby={getErrorId('date')}
        required
      />
    </CCol>
    <CCol xs={12} md={4}>
      <CFormLabel htmlFor="first-touch-time">Encounter time</CFormLabel>
      <CFormInput
        id="first-touch-time"
        type="time"
        value={form.occurredTime}
        onChange={(event) => onFormChange('occurredTime', event.target.value)}
        disabled={!form.timeKnown}
        invalid={errorField === 'time'}
        aria-describedby={getErrorId('time')}
      />
      <CFormCheck
        id="first-touch-time-known"
        className="mt-2"
        label="I know the exact time"
        checked={form.timeKnown}
        onChange={(event) => {
          onFormChange('timeKnown', event.target.checked)
          if (!event.target.checked) onFormChange('occurredTime', '')
        }}
      />
    </CCol>
    <CCol xs={12} md={4}>
      <CFormLabel htmlFor="first-touch-source">First-touch source</CFormLabel>
      <Select
        inputId="first-touch-source"
        options={sourceOptions}
        value={selectedSource || null}
        onChange={(source) => onFormChange('sourceValue', source?.value || '')}
        placeholder="Select a source"
        isClearable
        aria-invalid={errorField === 'source' || undefined}
        aria-describedby={getErrorId('source')}
        menuPortalTarget={selectPortalTarget}
        menuPosition="fixed"
      />
    </CCol>
    {sameDayAsCurrentClaim && (!form.timeKnown || !existingFirstTouch?.occurredTime) ? (
      <CCol xs={12}>
        <CAlert color="warning" className="mb-0">
          This evidence is from the same day as the current claim and the exact order is not known.
          It can still be submitted, but the reviewer must determine which encounter happened first.
        </CAlert>
      </CCol>
    ) : null}
    <CCol xs={12} md={6}>
      <CFormLabel htmlFor="first-touch-client-contact">Client contact</CFormLabel>
      <CFormInput
        id="first-touch-client-contact"
        value={form.clientContact}
        onChange={(event) => onFormChange('clientContact', event.target.value)}
        placeholder="Person involved at the client"
        maxLength={160}
      />
    </CCol>
    <CCol xs={12} md={6}>
      <CFormLabel htmlFor="first-touch-source-contact">Handled by or referred through</CFormLabel>
      <StaffSelect
        inputId="first-touch-source-contact"
        staff={staffOptions}
        encounterDate={form.occurredAt}
        value={
          form.contactMode === 'named'
            ? form.sourceContactStaffId
            : `contact-mode:${form.contactMode}`
        }
        onChange={onSourceContactChange}
        placeholder="Select staff or contact context"
        specialOptions={contactContextOptions}
        ariaInvalid={errorField === 'source-contact'}
        ariaDescribedBy={getErrorId('source-contact')}
        menuPortalTarget={selectPortalTarget}
        menuPosition="fixed"
      />
      {sourceContact?.endedAt ? (
        <div
          className="d-flex flex-wrap gap-3 mt-2"
          role="radiogroup"
          aria-label="Employment status during encounter"
          aria-describedby={getErrorId('employment-boundary')}
        >
          <CFormCheck
            type="radio"
            id="first-touch-while-in-service"
            name="first-touch-employment-status"
            label="While in service"
            checked={sourceContactContext === 'in_service'}
            onChange={() => onEmploymentBoundaryChange('before_departure')}
            invalid={errorField === 'employment-boundary'}
          />
          <CFormCheck
            type="radio"
            id="first-touch-after-leaving"
            name="first-touch-employment-status"
            label="After leaving Amiosh"
            checked={sourceContactContext === 'former'}
            onChange={() => onEmploymentBoundaryChange('after_departure')}
            invalid={errorField === 'employment-boundary'}
          />
          {((sourceContactRawContext === 'former' && sourceContactContext === 'in_service') ||
            (sourceContactRawContext === 'in_service' && sourceContactContext === 'former')) && (
            <span className="small text-warning-emphasis w-100">
              This differs from the recorded service dates. Confirm it against the evidence.
            </span>
          )}
        </div>
      ) : null}
    </CCol>
    <CCol xs={12} md={6}>
      <CFormLabel htmlFor="first-touch-inquiry">Linked inquiry</CFormLabel>
      <Select
        inputId="first-touch-inquiry"
        options={inquiryOptions.map((inquiry) => ({
          value: inquiry.id,
          label: [inquiry.reference, inquiry.inquiryDate, inquiry.serviceRequired]
            .filter(Boolean)
            .join(' · '),
          inquiry,
        }))}
        value={
          inquiryOptions
            .map((inquiry) => ({
              value: inquiry.id,
              label: [inquiry.reference, inquiry.inquiryDate, inquiry.serviceRequired]
                .filter(Boolean)
                .join(' · '),
              inquiry,
            }))
            .find((option) => String(option.value) === String(form.linkedInquiryId)) || null
        }
        onChange={(option) => {
          onFormChange('linkedInquiryId', option?.inquiry?.id || '')
          onFormChange('inquiryRef', option?.inquiry?.reference || '')
        }}
        placeholder="Optional inquiry linked to this client"
        isClearable
        menuPortalTarget={selectPortalTarget}
        menuPosition="fixed"
      />
      {form.inquiryRef &&
      !inquiryOptions.some((inquiry) => String(inquiry.id) === String(form.linkedInquiryId)) ? (
        <div className="small text-muted mt-1">Historical reference: {form.inquiryRef}</div>
      ) : null}
      {form.linkedInquiryId &&
      inquiryOptions.some((inquiry) => String(inquiry.id) === String(form.linkedInquiryId)) ? (
        <CButton
          component="a"
          color="link"
          className="p-0 mt-1"
          href={`/pipeline/inquiries/${form.linkedInquiryId}`}
          target="_blank"
          rel="noreferrer"
        >
          Open inquiry
        </CButton>
      ) : null}
    </CCol>
    <CCol xs={12}>
      <CFormLabel htmlFor="first-touch-notes">Remarks</CFormLabel>
      <CFormTextarea
        id="first-touch-notes"
        rows={3}
        value={form.notes}
        onChange={(event) => onFormChange('notes', event.target.value)}
        placeholder="Add any relevant context or remarks."
        maxLength={2000}
      />
    </CCol>
    {mode === 'edit' ? (
      <CCol xs={12}>
        <CFormLabel htmlFor="first-touch-edit-reason">Reason for this edit</CFormLabel>
        <CFormTextarea
          id="first-touch-edit-reason"
          rows={2}
          maxLength={500}
          value={form.editReason}
          onChange={(event) => onFormChange('editReason', event.target.value)}
          placeholder="Explain what changed and why the evidence record needs correction."
          invalid={errorField === 'edit-reason'}
          aria-describedby={getErrorId('edit-reason')}
          required
        />
      </CCol>
    ) : null}
    <CCol xs={12}>
      <FirstTouchEvidenceEditor
        proofs={proofs}
        busy={evidenceBusy}
        invalid={errorField === 'evidence'}
        errorId={getErrorId('evidence')}
        onAdd={onAddEvidence}
        onReplace={onReplaceEvidence}
        onRemove={onRemoveEvidence}
      />
    </CCol>
  </CRow>
)

export default FirstTouchClaimFields
