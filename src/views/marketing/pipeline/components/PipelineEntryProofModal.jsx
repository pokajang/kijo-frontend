import React from 'react'
import { CModal, CModalBody, CModalHeader, CModalTitle } from '@coreui/react'
import LoadingImage from '../../../../components/LoadingImage'
import { getPipelineEntryPhotoUrl } from '../pipelineEntryUtils'

const PipelineEntryProofModal = ({ entry, onClose }) => (
  <CModal visible={Boolean(entry)} onClose={onClose} alignment="center" size="xl">
    <CModalHeader>
      <CModalTitle>
        {entry?.prospectName || entry?.photoOriginalName || 'Screenshot Proof'}
      </CModalTitle>
    </CModalHeader>
    <CModalBody className="text-center">
      {entry?.photoUrl && (
        <LoadingImage
          src={getPipelineEntryPhotoUrl(entry)}
          alt={`Screenshot proof for ${entry?.prospectName || 'pipeline entry'}`}
          className="img-fluid rounded border app-proof-image"
          style={{ maxHeight: 'calc(100vh - 190px)', objectFit: 'contain' }}
          placeholderStyle={{ minHeight: 220 }}
        />
      )}
    </CModalBody>
  </CModal>
)

export default PipelineEntryProofModal
