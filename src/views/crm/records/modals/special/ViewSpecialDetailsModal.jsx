import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CCard,
} from '@coreui/react'
import QuoteMetadataSection from './QuoteMetadataSection'
import ClientDetailsSection from './ClientDetailsSection'
import ServiceDetailsSection from './ServiceDetailsSection'
import ProposalAttachmentSection from './ProposalAttachmentSection'
import LineItemsPricing from './LineItemsPricing'

const ViewSpecialDetailsModal = ({ visible, record, onClose }) => {
  if (!visible || !record) return null

  return (
    <CModal
      alignment="center"
      scrollable
      size="xl"
      visible={visible}
      onClose={onClose}
      backdrop="static"
    >
      <CModalHeader closeButton>
        <CModalTitle>Special Quote Details</CModalTitle>
      </CModalHeader>

      <CModalBody>
        <CCard className="mb-4">
          <QuoteMetadataSection {...record} />
          <ClientDetailsSection clientDetails={record.clientDetails} />
          <ServiceDetailsSection formData={record.formData} />

          {/* unified line items and pricing */}
          <LineItemsPricing
            lineItems={record.lineItems}
            subtotal={record.subtotal}
            sstPercent={record.formData.sstPercent}
            sstAmount={record.sstAmount}
            grandTotal={record.amount}
          />

          <ProposalAttachmentSection attachProposal={record.attachProposal} />
        </CCard>
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ViewSpecialDetailsModal
