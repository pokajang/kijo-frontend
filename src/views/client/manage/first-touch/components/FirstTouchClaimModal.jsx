import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CAlert,
  CButton,
  CForm,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { getStaffEmploymentContext } from '../../../../../components/forms/StaffSelect'
import {
  clientOriginSourceCatalog,
  inferClientOriginSourceValue,
} from '../../../../../features/client-origin/sourceCatalog'
import {
  createEvidenceProofs,
  MAX_FIRST_TOUCH_EVIDENCE_IMAGES,
  prepareEvidenceForSubmission,
  validateEvidenceFiles,
} from '../firstTouchEvidenceUtils'
import FirstTouchClaimFields from './FirstTouchClaimFields'
import FirstTouchDisputeFields from './FirstTouchDisputeFields'

const emptyForm = {
  occurredAt: '',
  occurredTime: '',
  timeKnown: false,
  sourceValue: '',
  clientContact: '',
  contactMode: 'named',
  sourceContactStaffId: '',
  employmentBoundary: '',
  linkedInquiryId: '',
  inquiryRef: '',
  notes: '',
  editReason: '',
}

const getLocalDateValue = () => {
  const today = new Date()
  const offset = today.getTimezoneOffset() * 60 * 1000
  return new Date(today.getTime() - offset).toISOString().slice(0, 10)
}

const findStaffById = (staffId, staffOptions = []) =>
  staffOptions.find((staff) => String(staff.id) === String(staffId))

const findStaffByName = (name, staffOptions = []) =>
  staffOptions.find((staff) => staff.fullName === name)

const getStaffOptionsWithHistoricalSnapshots = (existingFirstTouch, directoryStaffOptions) => {
  const options = [...directoryStaffOptions]
  const snapshots = [
    existingFirstTouch?.referrerName
      ? {
          id: existingFirstTouch.referrerStaffId || `historical-referrer-${existingFirstTouch.id}`,
          fullName: existingFirstTouch.referrerName,
          nameCode: existingFirstTouch.referrerCode || '',
          endedAt: existingFirstTouch.employmentEndedAt || null,
          departureType: existingFirstTouch.employmentDepartureType || null,
        }
      : null,
    existingFirstTouch?.amioshContact
      ? {
          id:
            existingFirstTouch.amioshContactStaffId ||
            `historical-contact-${existingFirstTouch.id}`,
          fullName: existingFirstTouch.amioshContact,
          nameCode: existingFirstTouch.amioshContactCode || '',
        }
      : null,
  ].filter(Boolean)

  snapshots.forEach((snapshot) => {
    const alreadyAvailable =
      findStaffById(snapshot.id, options) || findStaffByName(snapshot.fullName, options)
    if (!alreadyAvailable) options.push({ ...snapshot, directoryState: 'historical' })
  })

  return options
}

const FirstTouchClaimModal = ({
  visible,
  companyName,
  companyId,
  existingFirstTouch,
  mode = existingFirstTouch ? 'competing' : 'create',
  conflictOpen = false,
  staffOptions: directoryStaffOptions = [],
  inquiryOptions = [],
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(emptyForm)
  const [proofs, setProofs] = useState([])
  const [error, setError] = useState(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeExplanation, setDisputeExplanation] = useState('')
  const [dirty, setDirty] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [evidenceBusy, setEvidenceBusy] = useState(false)
  const errorSummaryRef = useRef(null)
  const staffOptions = useMemo(
    () => getStaffOptionsWithHistoricalSnapshots(existingFirstTouch, directoryStaffOptions),
    [directoryStaffOptions, existingFirstTouch],
  )

  useEffect(() => {
    if (!visible) return
    const shouldPrefill = mode === 'edit'
    const existingAmioshContact =
      findStaffById(existingFirstTouch?.amioshContactStaffId, staffOptions) ||
      findStaffByName(existingFirstTouch?.amioshContact, staffOptions)
    const existingReferrer =
      findStaffById(existingFirstTouch?.referrerStaffId, staffOptions) ||
      findStaffByName(existingFirstTouch?.referrerName, staffOptions)
    const existingContactMode =
      existingFirstTouch?.contactMode ||
      (existingReferrer || existingAmioshContact ? 'named' : 'unknown')
    const existingSourceContact = existingReferrer || existingAmioshContact
    const existingSourceContactContext = getStaffEmploymentContext(
      existingSourceContact,
      existingFirstTouch?.occurredAt,
    )
    const existingEmploymentBoundary =
      existingFirstTouch?.employmentBoundary ||
      (existingSourceContactContext === 'boundary'
        ? existingReferrer
          ? 'after_departure'
          : 'before_departure'
        : '')
    setForm(
      shouldPrefill
        ? {
            occurredAt: existingFirstTouch?.occurredAt || '',
            occurredTime: existingFirstTouch?.occurredTime || '',
            timeKnown: Boolean(existingFirstTouch?.occurredTime),
            sourceValue: inferClientOriginSourceValue(existingFirstTouch),
            clientContact: existingFirstTouch?.clientContact || '',
            contactMode: existingContactMode,
            sourceContactStaffId:
              existingContactMode === 'named'
                ? existingReferrer?.id || existingAmioshContact?.id || ''
                : '',
            employmentBoundary: existingEmploymentBoundary,
            linkedInquiryId: existingFirstTouch?.linkedInquiryId || '',
            inquiryRef: existingFirstTouch?.inquiryRef || '',
            notes: existingFirstTouch?.notes || '',
            editReason: '',
          }
        : {
            ...emptyForm,
            clientContact: existingFirstTouch?.clientContact || '',
          },
    )
    setProofs(
      shouldPrefill
        ? (existingFirstTouch?.proofs || []).map((proof) => ({
            ...proof,
            evidenceState: 'existing',
          }))
        : [],
    )
    setError(null)
    setDisputeReason('')
    setDisputeExplanation('')
    setDirty(false)
    setConfirmDiscard(false)
    setSubmitting(false)
    setEvidenceBusy(false)
  }, [existingFirstTouch, mode, staffOptions, visible])

  useEffect(() => {
    if (error) errorSummaryRef.current?.focus()
  }, [error])

  const sourceOptions = useMemo(() => {
    if (
      !form.sourceValue ||
      clientOriginSourceCatalog.some((item) => item.value === form.sourceValue)
    ) {
      return clientOriginSourceCatalog
    }
    return [
      {
        value: form.sourceValue,
        label: `${form.sourceValue} (Historical source)`,
        group: existingFirstTouch?.sourceGroup || 'Historical',
        channel: existingFirstTouch?.channel || form.sourceValue,
        method: existingFirstTouch?.method || 'Historical source',
        historical: true,
      },
      ...clientOriginSourceCatalog,
    ]
  }, [existingFirstTouch, form.sourceValue])
  const selectedSource = useMemo(
    () => sourceOptions.find((source) => source.value === form.sourceValue),
    [form.sourceValue, sourceOptions],
  )
  const sourceContact = useMemo(
    () => findStaffById(form.sourceContactStaffId, staffOptions),
    [form.sourceContactStaffId, staffOptions],
  )
  const sourceContactRawContext = getStaffEmploymentContext(sourceContact, form.occurredAt)
  const sourceContactContext =
    form.employmentBoundary === 'before_departure'
      ? 'in_service'
      : form.employmentBoundary === 'after_departure'
        ? 'former'
        : sourceContactRawContext
  const todayDate = getLocalDateValue()
  const selectPortalTarget = typeof document !== 'undefined' ? document.body : undefined
  const sameDayAsCurrentClaim =
    mode === 'competing' &&
    Boolean(form.occurredAt) &&
    form.occurredAt === existingFirstTouch?.occurredAt

  const showError = (field, message) => setError({ field, message })
  const clearError = () => setError(null)
  const getErrorId = (field) => (error?.field === field ? `first-touch-${field}-error` : undefined)

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setDirty(true)
    clearError()
  }

  const updateEncounterDate = (occurredAt) => {
    setDirty(true)
    clearError()
    setForm((current) => {
      const selectedStaff = findStaffById(current.sourceContactStaffId, staffOptions)
      const context = getStaffEmploymentContext(selectedStaff, occurredAt)
      const employmentBoundary = context === 'boundary' ? 'after_departure' : ''
      return {
        ...current,
        occurredAt,
        employmentBoundary,
      }
    })
  }

  const updateSourceContact = (selection) => {
    setDirty(true)
    clearError()

    if (selection?.contactMode) {
      setForm((current) => ({
        ...current,
        contactMode: selection.contactMode,
        sourceContactStaffId: '',
        employmentBoundary: '',
      }))
      return
    }

    const staff = selection
    const context = getStaffEmploymentContext(staff, form.occurredAt)
    const employmentBoundary = context === 'boundary' ? 'after_departure' : ''
    setForm((current) => ({
      ...current,
      contactMode: 'named',
      sourceContactStaffId: staff?.id || '',
      employmentBoundary,
    }))
  }

  const updateEmploymentBoundary = (employmentBoundary) => {
    setDirty(true)
    clearError()
    setForm((current) => ({
      ...current,
      employmentBoundary,
    }))
  }

  const getEvidenceContext = () => {
    const isDispute = mode === 'dispute'
    return {
      prefix: isDispute ? 'dispute-proof' : 'local',
      platform: isDispute ? 'Dispute attachment' : selectedSource?.channel || 'Uploaded proof',
      author: isDispute ? 'Current user' : form.clientContact || 'Evidence attachment',
      date: isDispute ? new Date().toISOString() : form.occurredAt || 'Encounter date',
    }
  }

  const addEvidence = async (fileList) => {
    const { files, error: fileError } = validateEvidenceFiles(fileList, {
      availableSlots: MAX_FIRST_TOUCH_EVIDENCE_IMAGES - proofs.length,
    })
    if (fileError) {
      showError('evidence', fileError)
      return
    }
    if (!files.length) return
    setEvidenceBusy(true)
    try {
      const nextProofs = await createEvidenceProofs(files, getEvidenceContext())
      setProofs((current) => [...current, ...nextProofs])
      setDirty(true)
      clearError()
    } catch {
      showError('evidence', 'Unable to preview the selected evidence images.')
    } finally {
      setEvidenceBusy(false)
    }
  }

  const replaceEvidence = async (index, fileList) => {
    const { files, error: fileError } = validateEvidenceFiles(fileList, {
      availableSlots: 1,
      single: true,
    })
    if (fileError) {
      showError('evidence', fileError)
      return
    }
    if (!files.length) return
    setEvidenceBusy(true)
    try {
      const [replacement] = await createEvidenceProofs(files, getEvidenceContext())
      setProofs((current) =>
        current.map((proof, proofIndex) => (proofIndex === index ? replacement : proof)),
      )
      setDirty(true)
      clearError()
    } catch {
      showError('evidence', 'Unable to preview the replacement evidence image.')
    } finally {
      setEvidenceBusy(false)
    }
  }

  const removeEvidence = (index) => {
    setProofs((current) => current.filter((_, proofIndex) => proofIndex !== index))
    setDirty(true)
    clearError()
  }

  const submitPayload = async (payload) => {
    setSubmitting(true)
    clearError()
    try {
      await Promise.resolve(onSubmit(payload))
      setDirty(false)
    } catch (submitError) {
      showError(
        'server',
        submitError?.message || 'The evidence could not be saved. Review the form and try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting || evidenceBusy) return
    if (mode === 'dispute') {
      if (!existingFirstTouch) {
        showError(
          'dispute',
          'The current claim is no longer available. Close and reload the record.',
        )
        return
      }
      if (!disputeReason) {
        showError('dispute-reason', 'Select why the current evidence should be reviewed.')
        return
      }
      if (!disputeExplanation.trim()) {
        showError('dispute-explanation', 'Explain what the reviewer should investigate.')
        return
      }
      await submitPayload({
        id: `dispute-${Date.now()}`,
        claimId: existingFirstTouch.id,
        reason: disputeReason,
        explanation: disputeExplanation.trim(),
        status: 'open',
        submittedBy: 'Current user',
        submittedAt: new Date().toISOString(),
        proofs: prepareEvidenceForSubmission(proofs),
      })
      return
    }

    if (!form.occurredAt) {
      showError('date', 'Enter the date when the first encounter occurred.')
      return
    }
    if (form.occurredAt > todayDate) {
      showError('date', 'The encounter date cannot be in the future.')
      return
    }
    if (form.timeKnown && !form.occurredTime) {
      showError('time', 'Enter the exact encounter time or mark the time as unknown.')
      return
    }
    if (!selectedSource) {
      showError('source', 'Select how the client first encountered Amiosh.')
      return
    }
    if (form.contactMode === 'named' && !sourceContact) {
      showError('source-contact', 'Select who handled or referred the first touch.')
      return
    }
    if (sourceContactRawContext === 'boundary' && !form.employmentBoundary) {
      showError(
        'employment-boundary',
        'Confirm whether the encounter happened before or after this person left Amiosh.',
      )
      return
    }
    if (!proofs.length) {
      showError('evidence', 'Attach at least one screenshot or image as evidence.')
      return
    }
    if (mode === 'edit' && !form.editReason.trim()) {
      showError('edit-reason', 'Explain why the current evidence is being changed.')
      return
    }
    if (sourceContactContext === 'not_started') {
      showError('source-contact', 'The selected person had not started employment on that date.')
      return
    }
    if (mode === 'competing' && existingFirstTouch?.occurredAt) {
      if (form.occurredAt > existingFirstTouch.occurredAt) {
        showError('date', 'Competing evidence must document an earlier encounter date.')
        return
      }
      if (
        sameDayAsCurrentClaim &&
        form.timeKnown &&
        existingFirstTouch.occurredTime &&
        form.occurredTime >= existingFirstTouch.occurredTime
      ) {
        showError('time', 'The competing encounter time must be earlier than the current claim.')
        return
      }
    }

    const shouldPreserveIdentity = mode === 'edit'
    const isFormerStaffReferral = sourceContactContext === 'former'
    const amioshContact = isFormerStaffReferral ? null : sourceContact
    const nonStaffContactLabel =
      form.contactMode === 'shared'
        ? 'Shared or automated Amiosh channel'
        : form.contactMode === 'unknown'
          ? 'Staff member not identified'
          : ''
    await submitPayload({
      ...(shouldPreserveIdentity ? existingFirstTouch : {}),
      id: shouldPreserveIdentity ? existingFirstTouch?.id : `draft-${Date.now()}`,
      expectedVersion: existingFirstTouch?.version ?? null,
      status: mode === 'competing' ? 'competing' : 'current',
      sourceGroup: selectedSource.group,
      sourceValue: selectedSource.value,
      channel: selectedSource.channel,
      method: selectedSource.method,
      occurredAt: form.occurredAt,
      occurredTime: form.timeKnown ? form.occurredTime : '',
      occurrencePrecision: form.timeKnown ? 'minute' : 'date',
      occurrenceTimezone:
        existingFirstTouch?.occurrenceTimezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        'Asia/Kuala_Lumpur',
      chronologyNeedsReview:
        sameDayAsCurrentClaim && (!form.timeKnown || !existingFirstTouch?.occurredTime),
      clientContact: form.clientContact.trim(),
      amioshContactStaffId: amioshContact?.id || null,
      amioshContact: amioshContact?.fullName || nonStaffContactLabel,
      amioshContactCode: amioshContact?.nameCode || '',
      referrerStaffId: isFormerStaffReferral ? sourceContact?.id || null : null,
      referrerName: isFormerStaffReferral ? sourceContact?.fullName || '' : '',
      referrerCode: isFormerStaffReferral ? sourceContact?.nameCode || '' : '',
      contactMode: form.contactMode,
      employmentContext: sourceContact ? sourceContactContext : form.contactMode,
      employmentBoundary: form.employmentBoundary || null,
      employmentEndedAt: sourceContact?.endedAt || null,
      employmentDepartureType: sourceContact?.departureType || null,
      linkedInquiryId: form.linkedInquiryId || null,
      inquiryRef: form.inquiryRef.trim(),
      notes: form.notes.trim(),
      editReason: mode === 'edit' ? form.editReason.trim() : '',
      submittedBy: shouldPreserveIdentity ? existingFirstTouch?.submittedBy : 'Current user',
      submittedAt: new Date().toISOString(),
      proofCount: proofs.length,
      proofs: prepareEvidenceForSubmission(proofs),
      revisions: shouldPreserveIdentity ? existingFirstTouch?.revisions || [] : [],
    })
  }

  const requestClose = () => {
    if (submitting || evidenceBusy) return
    if (!dirty) {
      onClose()
      return
    }
    setConfirmDiscard(true)
  }

  const discardChanges = () => {
    setDirty(false)
    setConfirmDiscard(false)
    onClose()
  }

  const modalTitle = {
    create: 'Document first touch',
    edit: 'Edit Evidence',
    competing: 'Submit evidence',
    dispute: 'Dispute first-touch evidence',
  }[mode]
  const submitLabel = {
    create: 'Record first touch',
    edit: 'Save Changes',
    competing: 'Submit evidence',
    dispute: 'Submit dispute',
  }[mode]
  const cancelLabel = mode === 'edit' ? 'Cancel Editing' : 'Cancel'

  return (
    <CModal
      visible={visible}
      onClose={requestClose}
      alignment="center"
      size="lg"
      backdrop="static"
      scrollable
    >
      <CModalHeader>
        <CModalTitle>{modalTitle}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CForm
          id="first-touch-evidence-form"
          onSubmit={handleSubmit}
          aria-busy={submitting || evidenceBusy || undefined}
        >
          {mode !== 'dispute' ? (
            <>
              <p className="text-muted">
                {mode === 'edit' ? 'Update' : 'Record'} the earliest encounter you can support for{' '}
                <span className="fw-semibold text-body">{companyName}</span>.
              </p>
              {mode === 'create' ? (
                <CAlert color="info">
                  This first submission becomes the client&apos;s current documented first touch
                  immediately. No routine approval is required.
                </CAlert>
              ) : null}
              {mode === 'edit' ? (
                <CAlert color="info">
                  You are updating the current documented first touch. Saving will replace the
                  current details while retaining the previous version in the audit history.
                </CAlert>
              ) : null}
              {mode === 'competing' ? (
                <CAlert color="warning">
                  {conflictOpen
                    ? 'This client already has an open conflict. Your evidence will be added as another competing claim for the independent reviewer.'
                    : 'A current claim already exists. Submitting this evidence will mark the client as contested and send both claims to an independent manager or system administrator.'}
                </CAlert>
              ) : null}
            </>
          ) : null}
          {error ? (
            <CAlert
              color="danger"
              id={`first-touch-${error.field}-error`}
              ref={errorSummaryRef}
              tabIndex={-1}
              role="alert"
            >
              {error.message}
            </CAlert>
          ) : null}
          {mode === 'dispute' ? (
            <FirstTouchDisputeFields
              companyName={companyName}
              currentClaim={existingFirstTouch}
              reason={disputeReason}
              explanation={disputeExplanation}
              proofs={proofs}
              evidenceBusy={evidenceBusy}
              reasonInvalid={error?.field === 'dispute-reason'}
              explanationInvalid={error?.field === 'dispute-explanation'}
              evidenceInvalid={error?.field === 'evidence'}
              errorId={error ? `first-touch-${error.field}-error` : undefined}
              onReasonChange={(value) => {
                setDisputeReason(value)
                setDirty(true)
                clearError()
              }}
              onExplanationChange={(value) => {
                setDisputeExplanation(value)
                setDirty(true)
                clearError()
              }}
              onAddEvidence={addEvidence}
              onReplaceEvidence={replaceEvidence}
              onRemoveEvidence={removeEvidence}
            />
          ) : (
            <FirstTouchClaimFields
              form={form}
              mode={mode}
              todayDate={todayDate}
              errorField={error?.field}
              getErrorId={getErrorId}
              sourceOptions={sourceOptions}
              selectedSource={selectedSource}
              selectPortalTarget={selectPortalTarget}
              existingFirstTouch={existingFirstTouch}
              sameDayAsCurrentClaim={sameDayAsCurrentClaim}
              staffOptions={staffOptions}
              companyId={companyId}
              inquiryOptions={inquiryOptions}
              sourceContact={sourceContact}
              sourceContactRawContext={sourceContactRawContext}
              sourceContactContext={sourceContactContext}
              proofs={proofs}
              evidenceBusy={evidenceBusy}
              onFormChange={updateForm}
              onEncounterDateChange={updateEncounterDate}
              onSourceContactChange={updateSourceContact}
              onEmploymentBoundaryChange={updateEmploymentBoundary}
              onAddEvidence={addEvidence}
              onReplaceEvidence={replaceEvidence}
              onRemoveEvidence={removeEvidence}
            />
          )}
        </CForm>
      </CModalBody>
      <CModalFooter>
        {confirmDiscard ? (
          <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 w-100">
            <span className="text-warning-emphasis fw-semibold">Discard unsaved changes?</span>
            <div className="d-flex gap-2 justify-content-end">
              <CButton color="secondary" variant="outline" onClick={() => setConfirmDiscard(false)}>
                Keep editing
              </CButton>
              <CButton color="danger" onClick={discardChanges}>
                Discard changes
              </CButton>
            </div>
          </div>
        ) : (
          <>
            <CButton
              color="secondary"
              variant="outline"
              onClick={requestClose}
              disabled={submitting || evidenceBusy}
            >
              {cancelLabel}
            </CButton>
            <CButton
              color={mode === 'dispute' ? 'danger' : 'primary'}
              type="submit"
              form="first-touch-evidence-form"
              disabled={submitting || evidenceBusy}
            >
              {submitting ? 'Saving…' : submitLabel}
            </CButton>
          </>
        )}
      </CModalFooter>
    </CModal>
  )
}

export default FirstTouchClaimModal
