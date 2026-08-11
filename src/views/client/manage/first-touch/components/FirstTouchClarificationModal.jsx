import React, { useEffect, useState } from 'react'
import {
  CAlert,
  CButton,
  CForm,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import {
  createEvidenceProofs,
  MAX_FIRST_TOUCH_EVIDENCE_IMAGES,
  prepareEvidenceForSubmission,
  validateEvidenceFiles,
} from '../firstTouchEvidenceUtils'
import FirstTouchEvidenceEditor from './FirstTouchEvidenceEditor'

const FirstTouchClarificationModal = ({ visible, clarification, onClose, onSubmit }) => {
  const [response, setResponse] = useState('')
  const [proofs, setProofs] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!visible) return
    setResponse('')
    setProofs([])
    setError('')
    setBusy(false)
    setSubmitting(false)
  }, [visible, clarification?.id])

  const readProofs = async (files, options = {}) => {
    const validation = validateEvidenceFiles(files, {
      availableSlots: options.single ? 1 : MAX_FIRST_TOUCH_EVIDENCE_IMAGES - proofs.length,
      single: options.single,
    })
    if (validation.error) {
      setError(validation.error)
      return []
    }
    setBusy(true)
    try {
      return await createEvidenceProofs(validation.files, {
        prefix: 'clarification',
        platform: 'Clarification evidence',
        author: 'Current user',
        date: new Date().toISOString().slice(0, 10),
      })
    } finally {
      setBusy(false)
    }
  }

  const addEvidence = async (files) => {
    const additions = await readProofs(files)
    if (additions.length) {
      setProofs((current) => [...current, ...additions])
      setError('')
    }
  }

  const replaceEvidence = async (index, files) => {
    const replacement = await readProofs(files, { single: true })
    if (replacement[0]) {
      setProofs((current) =>
        current.map((proof, proofIndex) => (proofIndex === index ? replacement[0] : proof)),
      )
      setError('')
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!response.trim()) {
      setError('Add the requested clarification before submitting.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await onSubmit({
        response: response.trim(),
        proofs: prepareEvidenceForSubmission(proofs),
      })
    } catch (submitError) {
      setError(submitError?.message || 'The clarification could not be submitted.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CModal
      visible={visible}
      onClose={submitting ? undefined : onClose}
      size="lg"
      alignment="center"
      backdrop="static"
      scrollable
    >
      <CModalHeader>
        <CModalTitle>Provide first-touch clarification</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CForm id="first-touch-clarification-form" onSubmit={submit}>
          <CAlert color="info">
            <div className="fw-semibold mb-1">Information requested</div>
            {clarification?.requestNote || 'Review the claims and provide the requested details.'}
          </CAlert>
          {error ? <CAlert color="danger">{error}</CAlert> : null}
          <div className="mb-3">
            <CFormLabel htmlFor="first-touch-clarification-response">Clarification</CFormLabel>
            <CFormTextarea
              id="first-touch-clarification-response"
              rows={5}
              maxLength={2000}
              value={response}
              onChange={(event) => {
                setResponse(event.target.value)
                setError('')
              }}
              placeholder="Provide the requested facts, dates, or context."
              disabled={submitting}
            />
          </div>
          <FirstTouchEvidenceEditor
            inputId="first-touch-clarification-evidence"
            proofs={proofs}
            evidenceRequired={false}
            busy={busy || submitting}
            onAdd={addEvidence}
            onReplace={replaceEvidence}
            onRemove={(index) =>
              setProofs((current) => current.filter((_, itemIndex) => itemIndex !== index))
            }
          />
        </CForm>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </CButton>
        <CButton
          color="primary"
          type="submit"
          form="first-touch-clarification-form"
          disabled={submitting || busy}
        >
          {submitting ? 'Submitting…' : 'Submit clarification'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default FirstTouchClarificationModal
