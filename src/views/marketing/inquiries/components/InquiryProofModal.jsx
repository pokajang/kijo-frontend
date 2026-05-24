import React from 'react'
import { CModal, CModalBody, CModalHeader, CModalTitle } from '@coreui/react'
import LoadingImage from '../../../../components/LoadingImage'
import { getInquiryProofUrl } from '../inquiryUtils'

const InquiryProofModal = ({ inquiry, onClose }) => (
  <CModal visible={Boolean(inquiry)} onClose={onClose} alignment="center" size="xl">
    <CModalHeader>
      <CModalTitle>{inquiry?.companyName || 'Inquiry Proofs'}</CModalTitle>
    </CModalHeader>
    <CModalBody>
      {inquiry?.proofs?.length > 0 && (
        <div className="d-flex flex-column gap-3">
          {inquiry.proofs.map((proof, index) => (
            <div key={proof.id || index}>
              <LoadingImage
                src={getInquiryProofUrl(inquiry.id, proof)}
                alt={proof.originalName || `Inquiry proof ${index + 1}`}
                className="img-fluid rounded border app-proof-image d-block mx-auto"
                style={{ maxHeight: 'calc(100vh - 220px)', objectFit: 'contain' }}
                placeholderStyle={{ minHeight: 220 }}
              />
              <div className="small text-muted text-center mt-2">
                {proof.originalName || `Proof ${index + 1}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </CModalBody>
  </CModal>
)

export default InquiryProofModal
