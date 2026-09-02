import React from 'react'
import PropTypes from 'prop-types'
import AuthenticatedDocumentPreviewModal from '../../../components/documents/AuthenticatedDocumentPreviewModal'

const VendorPaymentInvoicePreview = ({ visible, onClose, url, originalName = 'invoice' }) => (
  <AuthenticatedDocumentPreviewModal
    visible={visible}
    onClose={onClose}
    url={url}
    title="Invoice Preview"
    originalName={originalName}
    allowImages
  />
)

VendorPaymentInvoicePreview.propTypes = {
  onClose: PropTypes.func.isRequired,
  originalName: PropTypes.string,
  url: PropTypes.string,
  visible: PropTypes.bool,
}

export default VendorPaymentInvoicePreview
