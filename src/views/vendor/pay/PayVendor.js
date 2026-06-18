import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import Select from '../../../components/forms/ThemedSelect'

import dialog from '../../../components/dialog/dialogService'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { vendorModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import { fetchAllPagedRecords } from '../../../utils/detailPages'
import { getCurrentReturnTo } from '../../../utils/navigation/returnTo'
import { listActiveProjectOptions, listAssignedVendors } from '../../project/manage/projectApi'
import slugify from '../../../lib/slugify'
import { dispatchAppNotificationsChanged } from '../../../notifications/appNotificationEvents'
import { apiFetch } from '../../../api/apiClient'

const API_BASE = import.meta.env.VITE_API_BASE

const PAYMENT_CONTEXT_OPTIONS = [
  {
    value: 'Project',
    title: 'Project-Related',
    description: 'Pay a vendor already assigned to one of your active projects.',
  },
  {
    value: 'Office',
    title: 'Office-Related',
    description: 'Pay an active vendor for internal office work or purchases.',
  },
  {
    value: 'Other',
    title: 'Others',
    description: 'Pay an active vendor for miscellaneous non-project items.',
  },
]

const getProjectId = (project) => project?.project_id ?? project?.id
const getProjectName = (project) => project?.project_name ?? project?.projectName ?? ''
const getProjectType = (project) => project?.project_type ?? project?.projectType ?? ''
const getVendorId = (vendor) => vendor?.vendor_id ?? vendor?.id
const getVendorName = (vendor) => vendor?.vendor_name ?? vendor?.vendorName ?? ''

const loadActiveVendors = ({ signal } = {}) =>
  fetchAllPagedRecords({
    url: `${API_BASE}vendors`,
    params: { status: 'active' },
    dataKeys: ['data', 'vendors'],
    perPage: 100,
    options: { signal },
  })

const PayVendor = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const handoffProjectId = location.state?.paymentProjectId
  const handoffVendorId = location.state?.paymentVendorId

  const [allProjects, setAllProjects] = useState([])
  const [vendors, setVendors] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [paymentContext, setPaymentContext] = useState(
    location.state?.paymentContext || (handoffProjectId ? 'Project' : ''),
  )
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [loadingVendors, setLoadingVendors] = useState(false)
  const [selectionError, setSelectionError] = useState('')

  const [formData, setFormData] = useState({
    type: '',
    amount: '',
    method: '',
    remarks: '',
    receipt: null,
  })

  const clearVendorSelection = useCallback(() => {
    setSelectedVendor(null)
  }, [])

  const loadVendorsForProject = useCallback(
    async (project, options = {}, preferredVendorId = null) => {
      const projectId = getProjectId(project)
      if (!projectId) return

      setSelectedProject(project)
      clearVendorSelection()
      setSelectionError('')
      setLoadingVendors(true)

      try {
        const assignedVendors = await listAssignedVendors(projectId, options)
        setVendors(assignedVendors)

        const vendorIdToSelect =
          preferredVendorId ||
          (String(projectId) === String(handoffProjectId) ? handoffVendorId : null)

        if (vendorIdToSelect) {
          const matchedVendor = assignedVendors.find(
            (vendor) => String(getVendorId(vendor)) === String(vendorIdToSelect),
          )
          if (matchedVendor) {
            setSelectedVendor(matchedVendor)
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Error fetching assigned vendors:', err)
        setVendors([])
        setSelectionError(err.message || 'Failed to load assigned vendors.')
      } finally {
        setLoadingVendors(false)
      }
    },
    [clearVendorSelection, handoffProjectId, handoffVendorId],
  )

  useEffect(() => {
    const projectId = location.state?.paymentProjectId
    if (projectId) {
      setPaymentContext('Project')
    }
  }, [location.state?.paymentProjectId])

  useEffect(() => {
    const controller = new AbortController()
    setSelectionError('')

    if (paymentContext === 'Project') {
      setLoadingProjects(true)
      setVendors([])
      listActiveProjectOptions({ signal: controller.signal })
        .then(setAllProjects)
        .catch((err) => {
          if (err.name === 'AbortError') return
          console.error('Error fetching linked projects:', err)
          setAllProjects([])
          setSelectionError(err.message || 'Failed to load linked projects.')
        })
        .finally(() => setLoadingProjects(false))
    } else if (paymentContext) {
      setAllProjects([])
      setLoadingVendors(true)
      loadActiveVendors({ signal: controller.signal })
        .then(setVendors)
        .catch((err) => {
          if (err.name === 'AbortError') return
          console.error('Error fetching vendors:', err)
          setVendors([])
          setSelectionError(err.message || 'Failed to load vendors.')
        })
        .finally(() => setLoadingVendors(false))
    } else {
      setAllProjects([])
      setVendors([])
    }

    return () => {
      controller.abort()
    }
  }, [paymentContext])

  useEffect(() => {
    if (paymentContext !== 'Project' || !handoffProjectId || loadingProjects) return
    if (selectedProject && String(getProjectId(selectedProject)) === String(handoffProjectId)) {
      return
    }

    const matchedProject = allProjects.find(
      (project) => String(getProjectId(project)) === String(handoffProjectId),
    )
    if (matchedProject) {
      loadVendorsForProject(matchedProject, {}, handoffVendorId)
    }
  }, [
    allProjects,
    handoffProjectId,
    handoffVendorId,
    loadingProjects,
    loadVendorsForProject,
    paymentContext,
    selectedProject,
  ])

  const projectOptions = useMemo(
    () =>
      allProjects.map((project) => ({
        value: getProjectId(project),
        label: `${getProjectName(project)} (${project.status || '-'})`,
        data: project,
      })),
    [allProjects],
  )

  const vendorOptions = useMemo(
    () =>
      vendors.map((vendor) => ({
        value: getVendorId(vendor),
        label: getVendorName(vendor),
        data: vendor,
      })),
    [vendors],
  )

  const selectedProjectOption = useMemo(() => {
    if (!selectedProject) return null
    const selectedId = getProjectId(selectedProject)
    return (
      projectOptions.find((option) => String(option.value) === String(selectedId)) || {
        value: selectedId,
        label: `${getProjectName(selectedProject)} (${selectedProject.status || '-'})`,
        data: selectedProject,
      }
    )
  }, [projectOptions, selectedProject])

  const selectedVendorOption = useMemo(() => {
    if (!selectedVendor) return null
    const selectedId = getVendorId(selectedVendor)
    return (
      vendorOptions.find((option) => String(option.value) === String(selectedId)) || {
        value: selectedId,
        label: getVendorName(selectedVendor),
        data: selectedVendor,
      }
    )
  }, [selectedVendor, vendorOptions])

  const hasNoAssignedVendors =
    paymentContext === 'Project' && selectedProject && !loadingVendors && vendors.length === 0

  const handlePaymentContextChange = (value) => {
    if (value === paymentContext) return
    setPaymentContext(value)
    setSelectedProject(null)
    setVendors([])
    clearVendorSelection()
  }

  const handleProjectSelect = (option) => {
    if (!option) {
      setSelectedProject(null)
      setVendors([])
      clearVendorSelection()
      return
    }
    loadVendorsForProject(option.data)
  }

  const handleVendorSelect = (option) => {
    if (!option) {
      clearVendorSelection()
      return
    }

    setSelectedVendor(option.data)
  }

  const handleAssignOne = () => {
    const projectId = getProjectId(selectedProject)
    if (!projectId) return

    const typeSlug = slugify(getProjectType(selectedProject)) || 'project'
    const nameSlug = slugify(getProjectName(selectedProject)) || 'details'

    navigate(`/project/manage/${projectId}/${typeSlug}/${nameSlug}`, {
      state: {
        openVendorAssignment: true,
        returnTo: getCurrentReturnTo(location),
        paymentProjectId: projectId,
      },
    })
  }

  const handleSubmitPayment = () => {
    const vendorId = getVendorId(selectedVendor)
    const vendorName = getVendorName(selectedVendor)
    const amount = Number(formData.amount)

    if (!vendorId) {
      dialog.alert('Please select a vendor before submitting.')
      return
    }

    if (paymentContext === 'Project' && !selectedProject) {
      dialog.alert('Please select a project before submitting.')
      return
    }

    if (!formData.type) {
      dialog.alert('Please select a payment type.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      dialog.alert('Please enter a valid amount greater than 0.')
      return
    }

    if (!formData.method) {
      dialog.alert('Please select a payment method.')
      return
    }

    if (!formData.receipt) {
      dialog.alert('Please upload the invoice before submitting.')
      return
    }

    if (paymentContext === 'Other' && !formData.remarks.trim()) {
      dialog.alert("Please provide remarks for 'Other / Miscellaneous' payment.")
      return
    }

    const submitData = new FormData()
    submitData.append('vendor_id', vendorId)
    submitData.append('vendor_name', vendorName)
    submitData.append('project_id', getProjectId(selectedProject) || '')
    submitData.append('payment_context', paymentContext)
    submitData.append('payment_type', formData.type)
    submitData.append('amount', amount.toFixed(2))
    submitData.append('method', formData.method)
    submitData.append('remarks', formData.remarks)
    submitData.append('receipt', formData.receipt)

    apiFetch(`${API_BASE}vendor-payments`, {
      method: 'POST',
      body: submitData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.status === 'success' || data?.success === true) {
          dialog.alert('Payment request submitted.')
          dispatchAppNotificationsChanged()

          setFormData({
            type: '',
            amount: '',
            method: '',
            remarks: '',
            receipt: null,
          })
          clearVendorSelection()
          if (paymentContext !== 'Project') {
            setSelectedProject(null)
          }
        } else {
          dialog.alert('Submission failed: ' + data.message)
        }
      })
      .catch((err) => {
        dialog.alert('Submission failed: ' + err.message)
      })
  }

  return (
    <>
      <ModuleNavStrip tabs={vendorModuleTabs} activeTab="pay" ariaLabel="Vendor sections" />

      <CCard className="mb-4">
        <CCardHeader>
          <strong>Request Vendor Payment</strong>
        </CCardHeader>
        <CCardBody>
          <section>
            <CRow className="g-3">
              <CCol xs={12}>
                <CFormLabel>Payment Context</CFormLabel>
                <CRow className="g-3">
                  {PAYMENT_CONTEXT_OPTIONS.map((option) => {
                    const isSelected = paymentContext === option.value
                    return (
                      <CCol md={4} key={option.value}>
                        <label
                          className={`border rounded p-3 d-flex align-items-start gap-2 app-selectable-card vendor-payment-context-card h-100 ${
                            isSelected ? 'app-selectable-card--selected' : ''
                          }`}
                          style={{ cursor: 'pointer' }}
                        >
                          <CFormCheck
                            type="radio"
                            name="paymentContext"
                            checked={isSelected}
                            onChange={() => handlePaymentContextChange(option.value)}
                          />
                          <span>
                            <strong>{option.title}</strong>
                            <span className="d-block text-muted mt-1">{option.description}</span>
                          </span>
                        </label>
                      </CCol>
                    )
                  })}
                </CRow>
              </CCol>

              {paymentContext === 'Project' && (
                <CCol xs={12}>
                  <CFormLabel>Project</CFormLabel>
                  <Select
                    options={projectOptions}
                    value={selectedProjectOption}
                    onChange={handleProjectSelect}
                    isClearable
                    isLoading={loadingProjects}
                    placeholder="Select project"
                    loadingMessage={() => 'Loading linked projects...'}
                    noOptionsMessage={() =>
                      loadingProjects
                        ? 'Loading linked projects...'
                        : 'No active linked projects found.'
                    }
                  />
                </CCol>
              )}

              {selectionError && (
                <CCol xs={12}>
                  <CAlert color="warning" className="mb-0">
                    {selectionError}
                  </CAlert>
                </CCol>
              )}
            </CRow>
          </section>

          {paymentContext && (
            <section className="mt-4">
              <CRow className="g-3">
                <CCol xs={12}>
                  <CFormLabel>Vendor</CFormLabel>
                  <Select
                    options={vendorOptions}
                    value={selectedVendorOption}
                    onChange={handleVendorSelect}
                    isClearable
                    isDisabled={paymentContext === 'Project' && !selectedProject}
                    isLoading={loadingVendors}
                    placeholder={
                      paymentContext === 'Project' && !selectedProject
                        ? 'Select a project first'
                        : 'Select vendor'
                    }
                    loadingMessage={() => 'Loading vendors...'}
                    noOptionsMessage={() =>
                      loadingVendors
                        ? 'Loading vendors...'
                        : paymentContext === 'Project'
                          ? 'No vendors assigned to this project.'
                          : 'No active vendors found.'
                    }
                  />
                </CCol>

                {hasNoAssignedVendors && (
                  <CCol xs={12}>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className="text-muted">No vendor assigned to this project.</span>
                      <CButton color="primary" size="sm" onClick={handleAssignOne}>
                        Assign One
                      </CButton>
                    </div>
                  </CCol>
                )}
              </CRow>
            </section>
          )}

          {selectedVendor && (
            <section className="border-top pt-4 mt-4">
              <h2 className="h6 fw-semibold mb-3">Payment Details</h2>
              <CRow className="g-3">
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

                <CCol md={3}>
                  <CFormLabel htmlFor="vendorPaymentType">Payment Type</CFormLabel>
                  <CFormSelect
                    id="vendorPaymentType"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="">Select Payment Type</option>
                    <option value="Deposit">Deposit</option>
                    <option value="Full Payment">Full Payment</option>
                    <option value="Partial">Partial</option>
                  </CFormSelect>
                </CCol>

                <CCol md={3}>
                  <CFormLabel htmlFor="vendorPaymentAmount">Amount</CFormLabel>
                  <CFormInput
                    id="vendorPaymentAmount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </CCol>

                <CCol md={3}>
                  <CFormLabel htmlFor="vendorPaymentMethod">Payment Method</CFormLabel>
                  <CFormSelect
                    id="vendorPaymentMethod"
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  >
                    <option value="">Select method</option>
                    <option value="Online Transfer">Online Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </CFormSelect>
                </CCol>

                <CCol md={3}>
                  <CFormLabel htmlFor="vendorPaymentReceipt">Upload Invoice (5MB Max)</CFormLabel>
                  <CFormInput
                    id="vendorPaymentReceipt"
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
                  <CFormLabel htmlFor="vendorPaymentRemarks">Remarks</CFormLabel>
                  <CFormTextarea
                    id="vendorPaymentRemarks"
                    rows={1}
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="e.g. Electricity payment, invoice reference, or payment note"
                  />
                </CCol>

                <CCol md={12} className="d-flex justify-content-end">
                  <CButton color="primary" size="sm" onClick={handleSubmitPayment}>
                    Submit Payment
                  </CButton>
                </CCol>
              </CRow>
            </section>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default PayVendor
