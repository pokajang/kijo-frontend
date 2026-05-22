import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CFormSelect,
  CFormInput,
  CFormTextarea,
  CButton,
  CModal,
  CModalTitle,
  CModalBody,
  CModalHeader,
  CModalContent,
  CModalFooter,
} from '@coreui/react'
import Select from '../../../components/forms/ThemedSelect'

import PaymentHistoryTable from './PaymentHistoryTable.jsx'
import dialog from '../../../components/dialog/dialogService'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { vendorModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import { fetchAllPagedRecords, fetchJson } from '../../../utils/detailPages'

const API_BASE = import.meta.env.VITE_API_BASE

const PayVendor = () => {
  const navigate = useNavigate()
  const [allProjects, setAllProjects] = useState([])
  const [vendors, setVendors] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [paymentContext, setPaymentContext] = useState('')
  const [outstanding, setOutstanding] = useState(0)
  const [pastPayments, setPastPayments] = useState([])

  // states for invoice viewing
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedInvoiceUrl, setSelectedInvoiceUrl] = useState('')

  const [formData, setFormData] = useState({
    type: '',
    amount: '',
    method: '',
    reference: '',
    remarks: '',
    receipt: null,
  })

  useEffect(() => {
    if (paymentContext === 'Project') {
      fetch(`${API_BASE}vendor-projects`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          const projects = Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.projects)
              ? data.projects
              : []
          if (data?.status === 'success' || data?.success === true || projects.length > 0) {
            setAllProjects(projects) // each has project + vendors
          } else {
            setAllProjects([])
          }
        })
    } else if (paymentContext !== '') {
      // for Office / others
      fetch(`${API_BASE}vendors`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          const vendorList = Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.vendors)
              ? data.vendors
              : []
          if (data?.status === 'success' || data?.success === true || vendorList.length > 0) {
            setVendors(vendorList)
          } else {
            setVendors([])
          }
        })
    }

    // Reset on context switch
    setSelectedProject(null)
    setSelectedVendor(null)
    setOutstanding(0)
    setPastPayments([])
  }, [paymentContext])

  const handleProjectSelect = (projectId) => {
    const selected = allProjects.find((p) => String(p.project_id) === String(projectId))
    if (!selected) {
      setSelectedProject(null)
      setVendors([])
      return
    }

    setSelectedProject(selected)
    setVendors(selected.vendors || [])
    setSelectedVendor(null)
    setOutstanding(0)
    setPastPayments([])
  }

  const handlePaymentContextChange = (value) => {
    setPaymentContext(value)
    setSelectedProject(null)
    setSelectedVendor(null)
    setOutstanding(0)
    setPastPayments([])
  }

  const handleVendorSelect = (vendorId) => {
    const vendor = vendors.find((v) => String(v.vendor_id) === String(vendorId))
    if (!vendor) {
      console.error('Vendor not found:', vendorId)
      return
    }

    setSelectedVendor(vendor)

    // Load vendor payment history here via backend
    const historyUrl = `${API_BASE}vendor-payments/by-vendor`
    const historyParams = { vendor_id: vendorId, year: new Date().getFullYear() }
    fetchJson(
      `${historyUrl}?vendor_id=${encodeURIComponent(vendorId)}&year=${
        historyParams.year
      }&per_page=1`,
    )
      .then((data) => {
        const outstandingValue = data?.outstanding ?? data?.data?.outstanding ?? 0

        setOutstanding(Number(outstandingValue) || 0)
        return fetchAllPagedRecords({
          url: historyUrl,
          params: historyParams,
          dataKeys: ['history', 'data.history', 'data'],
          perPage: 100,
        })
      })
      .then((history) => {
        setPastPayments(history)
      })
      .catch((err) => {
        console.error('Error fetching payment history', err)
        setOutstanding(0)
        setPastPayments([])
      })
  }

  const handleSubmitPayment = () => {
    if (!formData.receipt) {
      dialog.alert('Please upload the invoice before submitting.')
      return
    }

    if (paymentContext === 'Other' && !formData.remarks.trim()) {
      dialog.alert("Please provide remarks for 'Other / Miscellaneous' payment.")
      return
    }

    const submitData = new FormData()
    submitData.append('vendor_id', selectedVendor?.vendor_id) // transmit vendor_id in all transaction
    submitData.append('vendor_name', selectedVendor?.vendor_name) // ✅ Correct field
    submitData.append('project_id', selectedProject?.project_id || '')
    submitData.append('payment_context', paymentContext)
    submitData.append('payment_type', formData.type) // ✅ match backend expected key
    submitData.append('amount', Number(formData.amount || 0).toFixed(2))
    submitData.append('method', formData.method)
    submitData.append('reference', formData.reference)
    submitData.append('remarks', formData.remarks)
    submitData.append('receipt', formData.receipt)

    fetch(`${API_BASE}vendor-payments`, {
      method: 'POST',
      body: submitData,
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.status === 'success' || data?.success === true) {
          dialog.alert('✅ Payment request submitted.')

          // Optional: reset form and selections
          setFormData({
            type: '',
            amount: '',
            method: '',
            reference: '',
            remarks: '',
            receipt: null,
          })
          setSelectedVendor(null)
          setSelectedProject(null)
          setOutstanding(0)
          setPastPayments([])
        } else {
          dialog.alert('❌ Submission failed: ' + data.message)
        }
      })
      .catch((err) => {
        dialog.alert('❌ Submission failed: ' + err.message)
      })
  }

  return (
    <>
      <ModuleNavStrip
        tabs={vendorModuleTabs}
        activeTab="payment-records"
        ariaLabel="Vendor sections"
      />
      <CCard className="mb-4">
        <CCardHeader>
          <strong>Request Vendor Payment</strong>
        </CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            {/* PAYMENT context SELECTION */}
            <CCol md={4}>
              <CFormLabel>Payment Context</CFormLabel>
              <CFormSelect
                value={paymentContext}
                onChange={(e) => handlePaymentContextChange(e.target.value)}
              >
                <option value="">Select Payment Context</option>
                <option value="Project">Project-Related</option>
                <option value="Office">Office-Related</option>
                <option value="Other">Others</option>
              </CFormSelect>
            </CCol>

            {/* PROJECT SELECTOR */}
            {paymentContext === 'Project' && (
              <CCol md={4}>
                <CFormLabel>Project</CFormLabel>
                <CFormSelect onChange={(e) => handleProjectSelect(e.target.value)}>
                  <option value="">Select Project</option>
                  {allProjects.map((p) => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.project_name} ({p.status})
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            )}

            {/* VENDOR SELECTOR */}
            <CCol md={paymentContext === 'Project' ? 4 : 8}>
              <CFormLabel>Vendor</CFormLabel>
              <Select
                options={vendors.map((v) => ({
                  value: v.vendor_id,
                  label: v.vendor_name,
                }))}
                value={
                  selectedVendor
                    ? { value: selectedVendor.vendor_id, label: selectedVendor.vendor_name }
                    : null
                }
                onChange={(selectedOption) => {
                  if (selectedOption) {
                    handleVendorSelect(selectedOption.value)
                  } else {
                    setSelectedVendor(null)
                    setOutstanding(0)
                    setPastPayments([])
                  }
                }}
                isClearable
                placeholder="Select vendor"
              />
            </CCol>

            {selectedVendor && (
              <>
                {/* PROJECT-ONLY FIELDS */}
                {paymentContext === 'Project' && (
                  <>
                    <CCol md={3}>
                      <CFormLabel>Award Value</CFormLabel>
                      <CFormInput
                        value={`RM ${parseFloat(selectedVendor?.award_value || 0).toFixed(2)}`}
                        disabled
                      />
                    </CCol>

                    <CCol md={6}>
                      <CFormLabel>Scope of Award</CFormLabel>
                      <CFormTextarea rows={1} value={selectedVendor?.position || '-'} disabled />
                    </CCol>
                  </>
                )}

                {/* COMMON PAYMENT FIELDS */}
                <CCol md={3}>
                  <CFormLabel>Payment Type</CFormLabel>
                  <CFormSelect onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                    <option>Select Payment Type</option>
                    <option value="Deposit">Deposit</option>
                    <option value="Full Payment">Full Payment</option>
                    <option value="Partial">Partial</option>
                  </CFormSelect>
                </CCol>

                <CCol md={3}>
                  <CFormLabel>Amount</CFormLabel>
                  <CFormInput
                    type="number"
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </CCol>

                <CCol md={3}>
                  <CFormLabel>Payment Method</CFormLabel>
                  <CFormSelect
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  >
                    <option>Select method</option>
                    <option value="Online Transfer">Online Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </CFormSelect>
                </CCol>

                <CCol md={3}>
                  <CFormLabel>Upload Invoice (5MB Max)</CFormLabel>
                  <CFormInput
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFormData({ ...formData, receipt: e.target.files[0] })}
                  />
                </CCol>

                <CCol md={4}>
                  <CFormLabel>Bank Name</CFormLabel>
                  <CFormInput value={selectedVendor?.bank_name || ''} disabled />
                </CCol>

                <CCol md={4}>
                  <CFormLabel>Account Holder Name</CFormLabel>
                  <CFormInput value={selectedVendor?.bank_holder_name || ''} disabled />
                </CCol>

                <CCol md={4}>
                  <CFormLabel>Bank Account Number</CFormLabel>
                  <CFormInput value={selectedVendor?.bank_account || ''} disabled />
                </CCol>

                <CCol md={12}>
                  <CFormLabel>Remarks</CFormLabel>
                  <CFormTextarea
                    rows={1}
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="e.g. Electricity payment, whatever, etc."
                  />
                </CCol>

                <CCol md={12}>
                  <CButton color="primary" onClick={handleSubmitPayment}>
                    Submit Payment
                  </CButton>
                </CCol>
              </>
            )}
          </CRow>
        </CCardBody>
      </CCard>

      {/* PAST PAYMENT RECORDS */}
      {selectedVendor && (
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Alltime Payment Records for {selectedVendor.vendor_name}</strong>
          </CCardHeader>
          <CCardBody>
            <PaymentHistoryTable
              payments={pastPayments}
              setSelectedInvoiceUrl={setSelectedInvoiceUrl}
              setShowInvoiceModal={setShowInvoiceModal}
              onViewPayment={(payment) =>
                navigate(`/vendor/pay/history/${payment.id}`, {
                  state: { record: payment, returnTo: '/vendor/pay' },
                })
              }
            />
          </CCardBody>
        </CCard>
      )}

      {/* view invoice modal */}
      <CModal size="lg" visible={showInvoiceModal} onClose={() => setShowInvoiceModal(false)}>
        <CModalHeader>
          <CModalTitle>
            {selectedVendor?.vendor_name
              ? `Invoice Preview for ${selectedVendor.vendor_name}`
              : 'Invoice Preview'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedInvoiceUrl ? (
            <iframe
              src={selectedInvoiceUrl}
              style={{ width: '100%', height: '600px', border: 'none' }}
              title="Invoice Preview"
            />
          ) : (
            <div className="text-center text-muted">No invoice selected.</div>
          )}
        </CModalBody>
      </CModal>
    </>
  )
}

export default PayVendor
