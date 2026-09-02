import React from 'react'
import PropTypes from 'prop-types'
import AuthenticatedDocumentPreviewModal from '../../../components/documents/AuthenticatedDocumentPreviewModal'

const VendorPaymentVoucherPreview = ({
  visible,
  onClose,
  url,
  voucherNumber,
  documentState = 'approved',
}) => (
  <AuthenticatedDocumentPreviewModal
    visible={visible}
    onClose={onClose}
    url={url}
    title={
      documentState === 'paid'
        ? 'Paid Payment Voucher'
        : documentState === 'void'
          ? 'Voided Payment Voucher'
          : 'Payment Voucher'
    }
    originalName={`${voucherNumber || 'payment-voucher'}${documentState === 'paid' ? '-PAID' : documentState === 'void' ? '-VOID' : ''}.pdf`}
  />
)

VendorPaymentVoucherPreview.propTypes = {
  onClose: PropTypes.func.isRequired,
  documentState: PropTypes.oneOf(['approved', 'paid', 'void']),
  url: PropTypes.string,
  visible: PropTypes.bool,
  voucherNumber: PropTypes.string,
}

export default VendorPaymentVoucherPreview
