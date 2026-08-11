import React from 'react'
import { CButton, CCol, CModal, CModalBody, CModalHeader, CModalTitle, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilExternalLink, cilImage } from '@coreui/icons'

const EvidenceCard = ({ proof, compact = false }) => (
  <article className={`first-touch-evidence ${compact ? 'first-touch-evidence--compact' : ''}`}>
    <div className="first-touch-evidence__topline">
      <span className="first-touch-evidence__platform-mark" aria-hidden="true">
        {String(proof?.platform || 'Proof')
          .slice(0, 2)
          .toUpperCase()}
      </span>
      <div className="min-w-0">
        <div className="fw-semibold text-truncate">{proof?.author || 'Evidence attachment'}</div>
        <div className="small text-muted">
          {[proof?.platform, proof?.date].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
    {proof?.previewUrl ? (
      <img
        src={proof.previewUrl}
        alt={proof.originalName || 'Uploaded first-touch evidence preview'}
        className="first-touch-evidence__uploaded-image"
      />
    ) : (
      <p className="first-touch-evidence__message mb-0">{proof?.text || 'Screenshot evidence'}</p>
    )}
  </article>
)

export const FirstTouchEvidenceGalleryModal = ({ visible, proofs = [], onClose }) => (
  <CModal visible={visible} onClose={onClose} alignment="center" size="xl">
    <CModalHeader>
      <CModalTitle>First-touch evidence</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <p className="text-muted mb-3">
        Evidence supports the documented client origin. It does not assign sales ownership.
      </p>
      {proofs.length ? (
        <CRow className="g-3">
          {proofs.map((proof, index) => (
            <CCol xs={12} lg={6} key={proof.id || index}>
              <EvidenceCard proof={proof} />
            </CCol>
          ))}
        </CRow>
      ) : (
        <div className="first-touch-empty-state">
          <CIcon icon={cilImage} size="xl" aria-hidden="true" />
          <div className="fw-semibold mt-2">No evidence attached</div>
        </div>
      )}
    </CModalBody>
  </CModal>
)

export const FirstTouchEvidenceThumb = ({ proof, proofCount = 0, onView }) => (
  <div className="first-touch-evidence-thumb">
    {proof ? <EvidenceCard proof={proof} compact /> : null}
    <CButton color="primary" variant="outline" size="sm" className="w-100" onClick={onView}>
      View evidence{proofCount > 1 ? ` (${proofCount})` : ''}
      <CIcon icon={cilExternalLink} className="ms-2" aria-hidden="true" />
    </CButton>
  </div>
)

export default EvidenceCard
