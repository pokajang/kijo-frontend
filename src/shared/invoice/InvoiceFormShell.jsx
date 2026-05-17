import React from 'react'
import ClientDetails from './ClientDetails'
import ProjectDetails from './ProjectDetails'
import InvoiceDetails from './InvoiceDetails'
import InvoiceFormLoader from './InvoiceFormLoader'
import HRDGrantMode from './HRDGrantMode'
import PaymentDetails from './PaymentDetails'

const InvoiceFormShell = ({
  mode = 'create',
  client,
  onClientChange,
  showPaymentMethod,
  paymentMethod,
  onPaymentMethodChange,
  project,
  quoteDetails,
  onProjectChange,
  invoiceDetails,
  onInvoiceDetailsChange,
  pricing,
  setPricing,
  grantApprovalNo,
  onGrantApprovalChange,
}) => (
  <>
    <ClientDetails
      form={client}
      handleChange={onClientChange}
      showPaymentMethod={showPaymentMethod}
      paymentMethod={paymentMethod}
      onPaymentMethodChange={onPaymentMethodChange}
    />

    <ProjectDetails
      project={project}
      quoteDetails={quoteDetails}
      onProjectChange={onProjectChange}
    />

    <InvoiceDetails form={invoiceDetails} handleChange={onInvoiceDetailsChange} mode={mode} />

    <InvoiceFormLoader
      project={project}
      quoteDetails={quoteDetails}
      pricing={pricing}
      setPricing={setPricing}
      mode={mode}
    />

    <HRDGrantMode
      quoteDetails={quoteDetails}
      grantApprovalNo={grantApprovalNo}
      onChange={onGrantApprovalChange}
      paymentMethod={paymentMethod}
    />

    {mode !== 'create' && (
      <PaymentDetails form={invoiceDetails} handleChange={onInvoiceDetailsChange} mode={mode} />
    )}
  </>
)

export default InvoiceFormShell
