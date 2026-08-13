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
  CAlert,
  CFormCheck,
  CFormFeedback,
  CFormInput,
} from '@coreui/react'
import InvoiceFormShell from '../../../../../shared/invoice/InvoiceFormShell'
import dialog from '../../../../../components/dialog/dialogService'
import { showToast } from '../../../../../components/toast/toastService'
import { buildPricingFromInvoice } from './utils/invoicePricingMapper'
import { normalizePaymentMethod } from './utils/paymentUtils'
import { buildBreakdownFromPricing } from './utils/pricingBreakdownBuilder'
import { toNumber } from './utils/numberUtils'
import { validateHygieneInvoicePricing } from '../../create/invoiceCreatePayload'
import { mapInvoiceFieldErrors } from '../../create/invoiceCreateApi'

const focusFirstFieldError = (fieldErrors = {}) => {
  const firstPath = Object.keys(fieldErrors)[0]
  if (!firstPath) return
  requestAnimationFrame(() => {
    const input = document.querySelector(`[data-field-path="${firstPath}"]`)
    input?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    input?.focus?.({ preventScroll: true })
  })
}

const focusDeviationField = (hasReason) => {
  requestAnimationFrame(() => {
    const path = hasReason ? 'deviation_acknowledged' : 'deviation_reason'
    const input = document.querySelector(`[data-field-path="${path}"]`)
    input?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    input?.focus?.({ preventScroll: true })
  })
}

const EditInvoiceModal = ({ visible, onClose, invoice, onSaved }) => {
  const [form, setForm] = useState(null)
  const [pricing, setPricing] = useState(null)
  const [quoteDetails, setQuoteDetails] = useState(null)
  const [projectDetails, setProjectDetails] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [deviationContext, setDeviationContext] = useState(null)
  const [deviationReason, setDeviationReason] = useState('')
  const [deviationAcknowledged, setDeviationAcknowledged] = useState(false)
  const [deviationError, setDeviationError] = useState('')

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
    const paymentTermsSource = inv.payment_terms_source || inv.paymentTermsSource || 'legacy'
    const clientPaymentTermsSource =
      inv.client_payment_terms_source ||
      (inv.client_payment_terms_days === null || inv.client_payment_terms_days === undefined
        ? 'system_default'
        : 'client')
    const clientPaymentTermsDays = inv.client_payment_terms_days ?? 30

    const mapped = buildPricingFromInvoice(inv)
    setPricing(mapped.pricing)
    setFieldErrors({})
    setDirty(false)
    setDeviationContext(null)
    setDeviationReason('')
    setDeviationAcknowledged(false)
    setDeviationError('')
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
      paymentTermsDays: inv.payment_terms_days ?? 30,
      paymentTermsSource,
      paymentTermsBaseDays:
        paymentTermsSource === 'invoice_override'
          ? clientPaymentTermsDays
          : (inv.payment_terms_days ?? 30),
      paymentTermsBaseSource:
        paymentTermsSource === 'invoice_override' ? clientPaymentTermsSource : paymentTermsSource,
      overridePaymentTerms: paymentTermsSource === 'invoice_override',
      paymentTermsTouched: false,
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
    if (!visible || !invoice) return
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
        // Chromium can report an aborted fetch as a generic TypeError. The
        // controller state is the reliable signal when the modal unmounts.
        if (!controller.signal.aborted && err.name !== 'AbortError') {
          console.error('Failed to load project details:', err)
        }
      })

    return () => controller.abort()
  }, [invoice, visible])

  // generic field handler
  const handleChange = (e) => {
    setDirty(true)
    const { name, value, type, checked } = e.target
    if (name === 'overridePaymentTerms') {
      setForm((prev) => ({
        ...prev,
        overridePaymentTerms: checked,
        paymentTermsTouched: true,
        paymentTermsSource: checked ? 'invoice_override' : prev.paymentTermsBaseSource,
        paymentTermsDays: checked ? prev.paymentTermsDays : prev.paymentTermsBaseDays,
      }))
      return
    }
    if (name === 'paymentTermsDays') {
      setForm((prev) => ({
        ...prev,
        paymentTermsDays: value,
        paymentTermsTouched: true,
        paymentTermsSource: 'invoice_override',
        overridePaymentTerms: true,
      }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  // payment method toggle handler
  const handlePaymentMethodChange = (input) => {
    setDirty(true)
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

    const isHrdPayment =
      String(form.paymentMethod || '')
        .trim()
        .toLowerCase() === 'hrd grant'
    const isTraining = form.serviceType === 'Training'
    const baseAmount =
      form.serviceType === 'Training' ? toNumber(pricing.subtotal) : toNumber(pricing.sub_total)
    const breakdown = buildBreakdownFromPricing(form.serviceType, pricing, quoteDetails)
    const normalizedBreakdown =
      isTraining && !isHrdPayment
        ? breakdown.filter(
            (line) =>
              !/^\s*(\d+(?:\.\d+)?\s*%\s*)?hrd\s*charge\b/i.test(
                String(line?.item_description || ''),
              ),
          )
        : breakdown

    if (form.serviceType === 'Industrial Hygiene') {
      const nextErrors = validateHygieneInvoicePricing(pricing)
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors)
        focusFirstFieldError(nextErrors)
        return
      }
    }
    if (deviationContext && (!deviationReason.trim() || !deviationAcknowledged)) {
      setDeviationError(
        !deviationReason.trim()
          ? 'Briefly explain why this invoice exceeds the project value.'
          : 'Confirm the project-value difference to continue.',
      )
      focusDeviationField(Boolean(deviationReason.trim()))
      return
    }
    if (!(await dialog.confirm('Save changes to this invoice?'))) return

    const purpose =
      form.serviceType === 'Manpower Supply' ? pricing.service_title || form.purpose : form.purpose

    const payload = {
      invoice_loa_no: form.loaNo,
      invoice_ref_no: form.invoiceRef,
      invoice_purpose: purpose,
      invoice_date: form.dateIssued,
      status: form.status,
      amount: baseAmount,
      sst_percent: toNumber(pricing.sst_percent ?? pricing.sst_rate),
      sst_amount: toNumber(pricing.sst_amount),
      grand_total: toNumber(pricing.grand_total),
      calculation_version:
        form.serviceType === 'Industrial Hygiene' ? 'typed_lines_v1' : 'legacy_service_v1',
      payment_method: form.paymentMethod,
      grant_approval_no: isTraining && isHrdPayment ? form.grantApprovalNo : null,
      remarks: pricing.remarks || '',
      quotation_remarks: pricing.quotation_remarks || '',
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

      breakdown: normalizedBreakdown,
      deviation_reason: deviationReason.trim() || null,
      deviation_acknowledged: deviationAcknowledged,
    }

    if (form.paymentTermsTouched) {
      payload.override_payment_terms = Boolean(form.overridePaymentTerms)
      if (form.overridePaymentTerms) {
        payload.payment_terms_days = Number(form.paymentTermsDays ?? 30)
      }
    }

    try {
      setSaving(true)
      const res = await fetch(`${import.meta.env.VITE_API_BASE}invoices`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok || result.status !== 'success') {
        if (result.code === 'invoice_over_project_value') {
          const responseErrors = result.field_errors || {}
          const reasonMissing = Boolean(responseErrors.deviation_reason)
          setDeviationContext(result.context || {})
          setDeviationError(
            responseErrors.deviation_reason?.[0] ||
              responseErrors.deviation_acknowledged?.[0] ||
              result.message ||
              'Confirm the project-value difference to continue.',
          )
          focusDeviationField(!reasonMissing)
          return
        }
        const responseFieldErrors = result.field_errors || result.errors
        if (responseFieldErrors) {
          const nextErrors = mapInvoiceFieldErrors(responseFieldErrors, normalizedBreakdown)
          setFieldErrors(nextErrors)
          focusFirstFieldError(nextErrors)
          return
        }
        dialog.alert(result.message || 'Invoice could not be saved. Your changes are retained.')
        return
      }
      if (result.status === 'success') {
        showToast('Invoice updated.')
        setDirty(false)
        await Promise.resolve(onSaved?.())
        onClose()
      }
    } catch (err) {
      dialog.alert('Invoice could not be saved. Your changes are retained. Please try again.')
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!visible || !form || !pricing) return null

  const handleRequestClose = async () => {
    if (saving) return
    if (dirty && !(await dialog.confirm('Discard unsaved invoice changes?'))) return
    onClose()
  }

  const projectForForm = {
    ...(projectDetails || {}),
    project_name: form.purpose || projectDetails?.project_name || '',
    project_type: form.serviceType || projectDetails?.project_type || '',
    award_date: projectDetails?.award_date || '',
    service_start_date: projectDetails?.service_start_date || '',
    service_end_date: projectDetails?.service_end_date || '',
    description: projectDetails?.description || '',
  }
  const statusLower = String(form.status || '').toLowerCase()
  const hasPayment = toNumber(form.paidAmount) > 0 || statusLower === 'paid'
  const financialLocked = hasPayment || ['cancelled', 'canceled', 'void'].includes(statusLower)
  const financialLockMessage = hasPayment
    ? 'Financial values are locked because payment has already been recorded.'
    : financialLocked
      ? 'Financial values are locked for a cancelled or void invoice.'
      : ''

  return (
    <CModal
      size="lg"
      visible={visible}
      onClose={handleRequestClose}
      backdrop="static"
      alignment="center"
      scrollable
    >
      <CModalHeader onClose={handleRequestClose}>
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
            fieldErrors={fieldErrors}
            onClearFieldError={(path) =>
              setFieldErrors((prev) => {
                if (!prev[path]) return prev
                const next = { ...prev }
                delete next[path]
                return next
              })
            }
            financialLocked={financialLocked}
            financialLockMessage={financialLockMessage}
            onDirty={() => {
              setDirty(true)
              if (deviationContext) {
                setDeviationAcknowledged(false)
                setDeviationError('')
              }
            }}
          />
          {deviationContext ? (
            <CAlert color="warning" className="mx-3 mb-3">
              <div className="fw-semibold mb-2">
                This invoice is RM {toNumber(deviationContext.overage).toFixed(2)} above the
                remaining project value.
              </div>
              <CFormInput
                value={deviationReason}
                onChange={(event) => {
                  setDeviationReason(event.target.value)
                  setDeviationError('')
                  setDirty(true)
                }}
                placeholder="Brief reason"
                aria-label="Reason for exceeding project value"
                data-field-path="deviation_reason"
                invalid={Boolean(deviationError && !deviationReason.trim())}
              />
              <CFormCheck
                className="mt-2"
                id="edit-invoice-deviation-acknowledgement"
                label="I confirm this project-value difference."
                checked={deviationAcknowledged}
                onChange={(event) => {
                  setDeviationAcknowledged(event.target.checked)
                  setDeviationError('')
                  setDirty(true)
                }}
                data-field-path="deviation_acknowledged"
              />
              {deviationError ? (
                <CFormFeedback invalid className="d-block">
                  {deviationError}
                </CFormFeedback>
              ) : null}
            </CAlert>
          ) : null}
        </CCard>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" onClick={handleRequestClose}>
          Cancel
        </CButton>
        <CButton color="primary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default EditInvoiceModal
