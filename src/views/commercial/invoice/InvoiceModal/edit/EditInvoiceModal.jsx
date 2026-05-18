// commercial/invoice/InvoiceModal/edit/EditInvoiceModal.jsx
import React, { useEffect, useState } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CCard,
} from '@coreui/react'
import InvoiceFormShell from '../../../../../shared/invoice/InvoiceFormShell'
import dialog from '../../../../../components/dialog/dialogService'
import { buildPricingFromInvoice } from './utils/invoicePricingMapper'
import { normalizePaymentMethod } from './utils/paymentUtils'
import { buildBreakdownFromPricing } from './utils/pricingBreakdownBuilder'
import { toNumber } from './utils/numberUtils'

const EditInvoiceModal = ({ visible, onClose, invoice, onSaved }) => {
  const [form, setForm] = useState(null)
  const [pricing, setPricing] = useState(null)
  const [quoteDetails, setQuoteDetails] = useState(null)
  const [projectDetails, setProjectDetails] = useState(null)

  useEffect(() => {
    if (!form || !pricing) return
    if (form.serviceType !== 'Manpower Supply') return
    const nextPurpose = pricing.service_title || ''
    if (nextPurpose && form.purpose !== nextPurpose) {
      setForm((prev) => ({ ...prev, purpose: nextPurpose }))
    }
  }, [form, pricing])

  // initialize form from fetched invoice
  useEffect(() => {
    if (!invoice) return
    const inv = invoice.raw || invoice
    const serviceType = inv.service_type || inv.serviceType
    const paymentMethod = normalizePaymentMethod(serviceType, inv.grant_approval_no)

    const mapped = buildPricingFromInvoice(inv)
    setPricing(mapped.pricing)
    setQuoteDetails(mapped.quoteDetails)
    setProjectDetails({
      project_name: inv.project_name || inv.invoice_purpose || '',
      project_type: serviceType || '',
      award_date: inv.award_date || '',
      service_start_date: inv.service_start_date || '',
      service_end_date: inv.service_end_date || '',
      description: inv.description || '',
    })

    setForm({
      loaNo: inv.loa_number || inv.invoice_loa_no || '',
      invoiceRef: inv.invoice_ref_no,
      runningNo: inv.invoice_running_no,
      serviceType,
      purpose: inv.invoice_purpose || '',
      dateIssued: inv.invoice_date || '',
      status: inv.status || '',
      paymentMethod,
      grantApprovalNo: inv.grant_approval_no || '',
      paidDate: inv.paid_date || '',
      paidAmount: inv.paid_amount || '',
      paidRemarks: inv.paid_remarks || '',

      // Billed-To overrides
      clientName: inv.invoice_client_name ?? inv.client_name ?? '',
      clientSSM: inv.invoice_client_ssm ?? inv.client_ssm ?? '',
      clientTIN: inv.invoice_client_tin ?? inv.client_tin ?? '',
      clientAddress: inv.invoice_client_address ?? inv.client_address ?? '',
      clientCity: inv.invoice_client_city ?? inv.client_city ?? '',
      clientState: inv.invoice_client_state ?? inv.client_state ?? '',
      clientZip: inv.invoice_client_zip ?? inv.client_zip ?? '',
      picName: inv.invoice_pic_name ?? inv.pic_name ?? '',
      picPhone: inv.invoice_pic_phone ?? inv.pic_phone ?? '',
      picEmail: inv.invoice_pic_email ?? inv.pic_email ?? '',
      picPosition: inv.invoice_pic_position ?? inv.pic_position ?? '',

      // original client for resetting
      originalClient: {
        clientName: inv.client_name || '',
        clientSSM: inv.client_ssm || '',
        clientTIN: inv.client_tin || '',
        clientAddress: inv.client_address || '',
        clientCity: inv.client_city || '',
        clientState: inv.client_state || '',
        clientZip: inv.client_zip || '',
        picName: inv.pic_name || '',
        picPhone: inv.pic_phone || '',
        picEmail: inv.pic_email || '',
      },
    })
  }, [invoice])

  useEffect(() => {
    if (!invoice) return
    const inv = invoice.raw || invoice
    const projectId = inv.project_id || inv.projectId
    if (!projectId) return

    const controller = new AbortController()
    fetch(`${import.meta.env.VITE_API_BASE}projects/${encodeURIComponent(projectId)}`, {
      signal: controller.signal,
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((result) => {
        if (result?.status === 'success' && result.data) {
          setProjectDetails((prev) => ({
            ...(prev || {}),
            ...result.data,
          }))
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Failed to load project details:', err)
        }
      })

    return () => controller.abort()
  }, [invoice])

  // generic field handler
  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  // payment method toggle handler
  const handlePaymentMethodChange = (input) => {
    const selected = typeof input === 'string' ? input : input?.target?.value
    const normalized = String(selected || '')
      .trim()
      .toLowerCase()
    const label = normalized === 'hrd grant' ? 'HRD Grant' : 'Direct Payment'
    setForm((prev) => {
      let updated = { ...prev, paymentMethod: label }

      if (label === 'HRD Grant') {
        updated = {
          ...updated,
          clientName: 'Human Resource Development Corporation',
          clientSSM: '123456-A', // replace with official HRD SSM number
          clientTIN: '',
          clientAddress: 'Wisma HRD Corp, Jalan Beringin, Bukit Damansara',
          clientCity: 'Kuala Lumpur',
          clientState: 'WP Kuala Lumpur',
          clientZip: '50490',
          picName: 'HRD Officer',
          picPhone: '',
          picEmail: '',
        }
      } else if (label === 'Direct Payment') {
        updated = {
          ...updated,
          ...prev.originalClient,
        }
      }
      return updated
    })
  }

  // save payload
  const handleSave = async () => {
    if (!form || !pricing) return
    if (!(await dialog.confirm('Save changes to this invoice?'))) return

    const baseAmount =
      form.serviceType === 'Training' ? toNumber(pricing.subtotal) : toNumber(pricing.sub_total)
    const breakdown = buildBreakdownFromPricing(form.serviceType, pricing, quoteDetails)

    const purpose =
      form.serviceType === 'Manpower Supply' ? pricing.service_title || form.purpose : form.purpose

    const payload = {
      invoice_loa_no: form.loaNo,
      invoice_ref_no: form.invoiceRef,
      invoice_purpose: purpose,
      invoice_date: form.dateIssued,
      status: form.status,
      amount: baseAmount,
      sst_amount: toNumber(pricing.sst_amount),
      grand_total: toNumber(pricing.grand_total),
      payment_method: form.paymentMethod,
      grant_approval_no: form.serviceType === 'Training' ? form.grantApprovalNo : null,
      remarks: pricing.remarks || '',
      paid_date: form.paidDate || null,
      paid_amount: form.paidAmount ? parseFloat(form.paidAmount) : null,
      paid_remarks: form.paidRemarks || null,

      // Billed-To overrides
      invoice_client_name: form.clientName,
      invoice_client_ssm: form.clientSSM,
      invoice_client_tin: form.clientTIN,
      invoice_client_address: form.clientAddress,
      invoice_client_city: form.clientCity,
      invoice_client_state: form.clientState,
      invoice_client_zip: form.clientZip,
      invoice_pic_name: form.picName,
      invoice_pic_phone: form.picPhone,
      invoice_pic_email: form.picEmail,
      invoice_pic_position: form.picPosition,

      breakdown,
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}invoices`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const text = await res.text()
        dialog.alert(`Update failed (${res.status}). ${text}`)
        return
      }
      const result = await res.json()
      if (result.status === 'success') {
        await dialog.alert('Invoice updated successfully.')
        await Promise.resolve(onSaved?.())
        onClose()
      } else {
        dialog.alert(result.message || 'Update failed.')
      }
    } catch (err) {
      dialog.alert('Save error. Please try again.')
      console.error('Save error:', err)
    }
  }

  if (!visible || !form || !pricing) return null

  const projectForForm = {
    ...(projectDetails || {}),
    project_name: form.purpose || projectDetails?.project_name || '',
    project_type: form.serviceType || projectDetails?.project_type || '',
    award_date: projectDetails?.award_date || '',
    service_start_date: projectDetails?.service_start_date || '',
    service_end_date: projectDetails?.service_end_date || '',
    description: projectDetails?.description || '',
  }

  return (
    <CModal
      size="lg"
      visible={visible}
      onClose={onClose}
      backdrop="static"
      alignment="center"
      scrollable
    >
      <CModalHeader onClose={onClose}>
        <CModalTitle>Edit Invoice</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CCard className="mb-4">
          <InvoiceFormShell
            mode="edit"
            client={form}
            onClientChange={handleChange}
            showPaymentMethod={String(form.serviceType || '').toLowerCase() === 'training'}
            paymentMethod={form.paymentMethod}
            onPaymentMethodChange={handlePaymentMethodChange}
            project={projectForForm}
            quoteDetails={quoteDetails}
            onProjectChange={null}
            invoiceDetails={form}
            onInvoiceDetailsChange={handleChange}
            pricing={pricing}
            setPricing={setPricing}
            grantApprovalNo={form.grantApprovalNo}
            onGrantApprovalChange={handleChange}
          />
        </CCard>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleSave}>
          Save
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default EditInvoiceModal
