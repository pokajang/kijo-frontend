import React, { useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CForm,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import dialog from '../../../components/dialog/dialogService'
import CompactSignatureUploader from '../../../components/signature/CompactSignatureUploader'
import { getPersonalSignatureFileUrl } from '../../../components/signature/signatureApi'
import { signHandbook } from '../api/handbookApi'

const REQUIRED_SCHEMA_VERSION = 2

const formatSignedAt = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const createSubmissionUuid = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    const value = character === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

const normalizeName = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase()

const HandbookAcknowledgementForm = ({
  signature = {},
  version = null,
  acknowledgement = null,
  signingContext = null,
  canSign = true,
  disabledMessage = '',
  onSigned = () => {},
}) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [typedLegalName, setTypedLegalName] = useState('')
  const [acceptedIds, setAcceptedIds] = useState([])
  const [personalSignature, setPersonalSignature] = useState(null)
  const [signatureImageFailed, setSignatureImageFailed] = useState(false)
  const [submissionUuid, setSubmissionUuid] = useState(createSubmissionUuid)
  const [loading, setLoading] = useState(false)
  const submissionPendingRef = useRef(false)

  const isSigned = signature.signed === true
  const signedAt = formatSignedAt(signature.signed_at)
  const declarations = useMemo(
    () =>
      Array.isArray(acknowledgement?.declarations)
        ? [...acknowledgement.declarations].sort(
            (left, right) => Number(left.order || 0) - Number(right.order || 0),
          )
        : [],
    [acknowledgement],
  )
  const requiredIds = useMemo(
    () => declarations.filter((item) => item.required === true).map((item) => item.id),
    [declarations],
  )
  const isEvidenceVersion = Number(acknowledgement?.schemaVersion || 0) >= REQUIRED_SCHEMA_VERSION
  const profile = signingContext?.profile || null
  const personalSignatureUrl = personalSignature?.sha256
    ? getPersonalSignatureFileUrl(personalSignature.sha256)
    : null
  const signatureReady = Boolean(
    personalSignature?.available &&
      personalSignature?.sha256 &&
      personalSignatureUrl &&
      !signatureImageFailed,
  )
  const allDeclarationsAccepted =
    requiredIds.length > 0 && requiredIds.every((id) => acceptedIds.includes(id))
  const legalNameMatches =
    normalizeName(typedLegalName) !== '' &&
    normalizeName(typedLegalName) === normalizeName(profile?.full_name)
  const contextReady = signingContext?.available === true
  const effectiveCanSign = canSign && Boolean(version?.id) && isEvidenceVersion && contextReady

  useEffect(() => {
    setPersonalSignature(signingContext?.personal_signature || null)
    setSignatureImageFailed(false)
  }, [signingContext])

  const effectiveDisabledMessage =
    disabledMessage ||
    signingContext?.reason ||
    (!isEvidenceVersion
      ? 'HR must publish a handbook version containing the current acknowledgement evidence module before staff can sign.'
      : 'The current handbook version must load before signing.')

  const openModal = () => {
    setTypedLegalName('')
    setAcceptedIds([])
    setSubmissionUuid(createSubmissionUuid())
    setModalVisible(true)
  }

  const toggleDeclaration = (id, checked) => {
    setAcceptedIds((current) =>
      checked ? [...new Set([...current, id])] : current.filter((value) => value !== id),
    )
  }

  const handleUploaded = async (uploadedSignature) => {
    setPersonalSignature(uploadedSignature)
    setSignatureImageFailed(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (loading || submissionPendingRef.current) return

    if (!effectiveCanSign) {
      dialog.alert(effectiveDisabledMessage)
      return
    }
    if (!allDeclarationsAccepted) {
      dialog.alert('Accept every required declaration before signing.')
      return
    }
    if (!legalNameMatches) {
      dialog.alert('Typed legal name must match your staff profile.')
      return
    }
    if (!signatureReady) {
      dialog.alert('Upload and review your personal signature before signing.')
      return
    }

    submissionPendingRef.current = true
    let confirmed = false
    try {
      confirmed = await dialog.confirm(
        `Submit your electronic signature for ${version?.version_label || 'this handbook version'}?`,
      )
    } catch (error) {
      console.error(error)
      dialog.alert('The confirmation could not be completed.')
      submissionPendingRef.current = false
      return
    }
    if (!confirmed) {
      submissionPendingRef.current = false
      return
    }

    setLoading(true)
    try {
      const json = await signHandbook({
        submission_uuid: submissionUuid,
        handbook_version_id: version.id,
        typed_legal_name: typedLegalName.trim(),
        accepted_declaration_ids: requiredIds,
        acknowledgement_sha256: signingContext.acknowledgement_sha256,
        personal_signature_sha256: personalSignature.sha256,
      })

      if (!json.success) {
        dialog.alert(json.message || 'The electronic signature could not be recorded.')
        return
      }

      dialog.alert('Acknowledgement recorded successfully.')
      setModalVisible(false)
      window.dispatchEvent(new Event('kijo:handbook-signed'))
      await onSigned({
        ...(json.data || {}),
        full_name: typedLegalName.trim(),
      })
    } catch (error) {
      console.error(error)
      dialog.alert('An unexpected error occurred.')
    } finally {
      setLoading(false)
      submissionPendingRef.current = false
    }
  }

  return (
    <>
      <CCard className="my-4">
        <CCardBody className="text-center">
          {isSigned ? (
            <div>
              <CBadge color="success" shape="rounded-pill" className="mb-2">
                Electronically signed
              </CBadge>
              <p className="mb-0 text-success fw-semibold">
                Signed{signature.full_name ? ` by ${signature.full_name}` : ''}
                {signedAt ? ` on ${signedAt}` : ''}.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-2">
                Review and accept all mandatory declarations, confirm your staff profile, type your
                legal name, and select your personal signature.
              </p>
              {version?.version_label && (
                <p className="text-muted mb-2">Version: {version.version_label}</p>
              )}
              {!effectiveCanSign && <CAlert color="warning">{effectiveDisabledMessage}</CAlert>}
              <CButton color="primary" size="sm" onClick={openModal} disabled={!effectiveCanSign}>
                Review &amp; Sign
              </CButton>
            </>
          )}
        </CCardBody>
      </CCard>

      <CModal
        visible={modalVisible && !isSigned && effectiveCanSign}
        onClose={() => !loading && setModalVisible(false)}
        alignment="center"
        size="lg"
        backdrop="static"
      >
        <CModalHeader closeButton={!loading}>
          <CModalTitle>Handbook Acknowledgement &amp; Electronic Signature</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm id="handbook-acknowledgement-form" onSubmit={handleSubmit}>
            <section className="mb-4">
              <h6>Employee Profile</h6>
              <div className="row g-2">
                {[
                  ['Full Name', profile?.full_name],
                  ['NRIC / Passport', profile?.identity_number],
                  ['Employee ID', profile?.employee_code],
                  ['Designation', profile?.designation],
                  ['Department / Division', profile?.department],
                ].map(([label, value]) => (
                  <div className="col-md-6" key={label}>
                    <CFormLabel>{label}</CFormLabel>
                    <CFormInput value={value || 'Not available'} disabled readOnly />
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-4">
              <h6>Mandatory Legal Declarations</h6>
              <div className="d-flex flex-column gap-3">
                {declarations.map((declaration) => (
                  <div className="border rounded p-3" key={declaration.id}>
                    <CFormCheck
                      id={`handbook-declaration-${declaration.id}`}
                      checked={acceptedIds.includes(declaration.id)}
                      onChange={(event) => toggleDeclaration(declaration.id, event.target.checked)}
                      disabled={loading}
                      label={<strong>{declaration.title}</strong>}
                    />
                    <p className="small mb-0 mt-2">{declaration.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-4">
              <h6>Personal Signature</h6>
              {signatureReady ? (
                <div>
                  <div className="border rounded p-3 text-center">
                    <img
                      src={personalSignatureUrl}
                      alt="Selected personal signature"
                      style={{ maxWidth: '100%', maxHeight: '130px' }}
                      onError={() => setSignatureImageFailed(true)}
                    />
                  </div>
                  <p className="small text-success mt-2 mb-0">
                    Your saved personal signature will be copied into this acknowledgement record.
                  </p>
                </div>
              ) : (
                <div>
                  <CAlert color="info">
                    {signatureImageFailed
                      ? 'Your saved signature could not be loaded. Upload it again to continue.'
                      : 'No personal signature is available. Upload one to continue.'}
                  </CAlert>
                  <CompactSignatureUploader onUploaded={handleUploaded} disabled={loading} />
                </div>
              )}
            </section>

            <section>
              <CFormLabel htmlFor="typedLegalName">
                Type Your Full Name Exactly as Shown Above
              </CFormLabel>
              <CFormInput
                id="typedLegalName"
                autoComplete="name"
                value={typedLegalName}
                onChange={(event) => setTypedLegalName(event.target.value)}
                invalid={typedLegalName.length > 0 && !legalNameMatches}
                disabled={loading}
                required
              />
              <div className="form-text">
                This confirms your identity and intent to sign electronically.
              </div>
              {typedLegalName.length > 0 && !legalNameMatches && (
                <div className="invalid-feedback d-block">
                  Enter your full name exactly as shown in the profile above.
                </div>
              )}
            </section>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setModalVisible(false)}
            disabled={loading}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            size="sm"
            type="submit"
            form="handbook-acknowledgement-form"
            disabled={loading || !allDeclarationsAccepted || !legalNameMatches || !signatureReady}
          >
            {loading ? 'Signing...' : 'Submit Electronic Signature'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

HandbookAcknowledgementForm.propTypes = {
  signature: PropTypes.shape({
    signed: PropTypes.bool,
    signed_at: PropTypes.string,
    full_name: PropTypes.string,
  }),
  version: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    version_label: PropTypes.string,
  }),
  acknowledgement: PropTypes.shape({
    schemaVersion: PropTypes.number,
    declarations: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        body: PropTypes.string.isRequired,
        required: PropTypes.bool,
        order: PropTypes.number,
      }),
    ),
  }),
  signingContext: PropTypes.shape({
    available: PropTypes.bool,
    reason: PropTypes.string,
    acknowledgement_sha256: PropTypes.string,
    profile: PropTypes.object,
    personal_signature: PropTypes.object,
  }),
  canSign: PropTypes.bool,
  disabledMessage: PropTypes.string,
  onSigned: PropTypes.func,
}

export default HandbookAcknowledgementForm
