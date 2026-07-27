import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CAlert, CBadge, CSpinner } from '@coreui/react'
import RightSideDrawer from '../../../components/right-drawer/RightSideDrawer'
import { getHandbookSignatureEvidence } from '../api/handbookApi'
import { formatAcknowledgementSignedAt } from '../utils/handbookAcknowledgementRecordsConfig'

const Value = ({ label, children }) => (
  <div className="mb-2">
    <div className="small text-body-secondary">{label}</div>
    <div className="text-break">{children || 'N/A'}</div>
  </div>
)

Value.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node,
}

const HandbookAcknowledgementEvidenceDrawer = ({ recordId, open, onClose }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [evidence, setEvidence] = useState(null)

  useEffect(() => {
    if (!open || !recordId) return undefined
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setEvidence(null)

    getHandbookSignatureEvidence({ signatureId: recordId, signal: controller.signal })
      .then((json) => {
        if (!json.success) throw new Error(json.message || 'Unable to load evidence.')
        setEvidence(json.data)
      })
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message || 'Unable to load evidence.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [open, recordId])

  return (
    <RightSideDrawer
      open={open}
      title="Acknowledgement Evidence"
      onClose={onClose}
      width="min(620px, 100vw)"
      closeLabel="Close acknowledgement evidence"
    >
      {loading && (
        <div className="d-flex align-items-center gap-2">
          <CSpinner size="sm" />
          Loading evidence...
        </div>
      )}
      {error && <CAlert color="danger">{error}</CAlert>}
      {evidence && (
        <>
          <div className="d-flex gap-2 flex-wrap mb-3">
            <CBadge color={evidence.evidence_status === 'complete' ? 'success' : 'secondary'}>
              {evidence.evidence_status === 'complete'
                ? 'Electronic acknowledgement'
                : 'Legacy acknowledgement'}
            </CBadge>
            {evidence.evidence_status === 'complete' && (
              <CBadge color={evidence.integrity_verified ? 'success' : 'danger'}>
                {evidence.integrity_scope === 'full_evidence' ? 'Full evidence' : 'Core evidence'}{' '}
                integrity {evidence.integrity_verified ? 'verified' : 'failed'}
              </CBadge>
            )}
          </div>
          {evidence.evidence_status === 'complete' && !evidence.integrity_verified && (
            <CAlert color="danger">
              One or more preserved evidence checks failed. Do not rely on this record until it has
              been investigated.
            </CAlert>
          )}

          <h6>Employee</h6>
          <div className="row">
            <div className="col-sm-6">
              <Value label="Full Name">{evidence.profile?.full_name}</Value>
            </div>
            <div className="col-sm-6">
              <Value label="Employee ID">{evidence.profile?.employee_code}</Value>
            </div>
            <div className="col-sm-6">
              <Value label="Designation">{evidence.profile?.designation}</Value>
            </div>
            <div className="col-sm-6">
              <Value label="Department">{evidence.profile?.department}</Value>
            </div>
            <div className="col-sm-6">
              <Value label="NRIC / Passport">{evidence.profile?.identity_number_masked}</Value>
            </div>
          </div>

          <hr />
          <h6>Handbook</h6>
          <Value label="Version">{evidence.version?.label}</Value>
          <Value label="Record UUID">{evidence.submission_uuid}</Value>

          <hr />
          <h6>Declarations</h6>
          {evidence.declarations?.length ? (
            evidence.declarations.map((declaration) => (
              <div className="border rounded p-3 mb-2" key={declaration.id}>
                <div className="fw-semibold text-success">✓ {declaration.title}</div>
                <p className="small mb-1 mt-2">{declaration.body}</p>
                <div className="small text-body-secondary">
                  Accepted {formatAcknowledgementSignedAt(declaration.accepted_at)}
                </div>
              </div>
            ))
          ) : (
            <CAlert color="secondary">
              Individual declarations were not captured for this legacy record.
            </CAlert>
          )}

          <hr />
          <h6>Electronic Signature</h6>
          {evidence.signature?.preview_url ? (
            <div className="border rounded p-3 text-center mb-3">
              <img
                src={evidence.signature.preview_url}
                alt="Preserved employee signature"
                style={{ maxWidth: '100%', maxHeight: '140px' }}
              />
            </div>
          ) : (
            <CAlert color="secondary">
              No immutable signature image exists for this legacy record.
            </CAlert>
          )}
          <Value label="Typed Legal Name">{evidence.signature?.typed_legal_name}</Value>
          <Value label="Method">
            {evidence.signature?.method === 'personal_signature_snapshot'
              ? 'Saved personal signature snapshot'
              : 'Legacy acknowledgement'}
          </Value>
          <Value label="Signed At">
            {formatAcknowledgementSignedAt(evidence.signature?.signed_at)}
          </Value>

          <hr />
          <h6>Restricted Audit Information</h6>
          <Value label="IP Address">{evidence.audit?.ip_address}</Value>
          <Value label="User Agent">{evidence.audit?.user_agent}</Value>
          <Value label="Signed Payload SHA-256">{evidence.audit?.signed_payload_sha256}</Value>
          <Value label="Evidence Key ID">{evidence.audit?.evidence_key_id}</Value>
        </>
      )}
    </RightSideDrawer>
  )
}

HandbookAcknowledgementEvidenceDrawer.propTypes = {
  recordId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default HandbookAcknowledgementEvidenceDrawer
