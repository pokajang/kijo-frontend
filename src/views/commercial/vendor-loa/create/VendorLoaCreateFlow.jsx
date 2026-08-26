import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
} from '@coreui/react'

import { DataTableLoadingState } from '../../../../components/datatable'
import dialog from '../../../../components/dialog/dialogService'
import {
  confirmExistingCommercialDocs,
  hasProjectCommercialDocGroups,
  ProjectCommercialDocsNotice,
  useProjectCommercialDocs,
} from '../../../project/manage/commercialDocsWarning'
import { listAllVendors, saveProjectVendor } from '../../../project/manage/projectApi'
import {
  buildEquipmentServicesDescription,
  buildVendorLoaCreatePayload,
  getCreatedAssignmentId,
  getVendorLoaUrl,
  getVendorLoaWordUrl,
} from './vendorLoaCreatePayload'
import VendorLoaReviewStep from './VendorLoaReviewStep'
import { downloadCommercialWord } from '../../shared/commercialWordDownload'
import useCommercialCreationSuccess from '../../shared/useCommercialCreationSuccess'

const paymentTermOptions = ['Before pickup/delivery', '14 days', '30 days', '45 days', '60 days']
const vendorLoaSuccessActions = [
  {
    key: 'generate',
    label: 'Generate LOA',
    color: 'secondary',
    variant: 'outline',
  },
  {
    key: 'generate-word',
    label: 'Generate Word',
    color: 'secondary',
    variant: 'outline',
  },
]

const VendorLoaCreateFlow = ({ project, origin = 'project', onBack }) => {
  const commercialDocs = useProjectCommercialDocs(project?.id, true)
  const [step, setStep] = useState('edit')
  const [vendors, setVendors] = useState([])
  const [vendorsLoading, setVendorsLoading] = useState(true)
  const [vendorsError, setVendorsError] = useState('')
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [awardAmount, setAwardAmount] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [awardPosition, setAwardPosition] = useState('')
  const [awardRemarks, setAwardRemarks] = useState('')
  const [servicesDescription, setServicesDescription] = useState('')
  const [venueDetails, setVenueDetails] = useState('')
  const [feeBreakdown, setFeeBreakdown] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (project?.project_type !== 'Equipment Supply') return

    setAwardRemarks((current) => current || project.quotation_remarks || '')
    setServicesDescription((current) => current || buildEquipmentServicesDescription(project))
  }, [project])

  useEffect(() => {
    const controller = new AbortController()
    setVendorsLoading(true)
    setVendorsError('')

    listAllVendors({ signal: controller.signal })
      .then((rows) => setVendors(Array.isArray(rows) ? rows : []))
      .catch((err) => {
        if (err.name === 'AbortError') return
        console.error('Failed to load vendors:', err)
        setVendors([])
        setVendorsError(err.message || 'Failed to load vendors.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setVendorsLoading(false)
      })

    return () => controller.abort()
  }, [])

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => String(vendor.vendor_id) === String(selectedVendorId)) || null,
    [selectedVendorId, vendors],
  )
  const handleSuccessAction = useCallback(
    (action, receipt) => {
      if (!project?.id || !receipt.vendorId) return
      const urlParams = {
        projectId: project.id,
        vendorId: receipt.vendorId,
        assignmentId: receipt.detailId,
      }
      if (action === 'generate-word') {
        return downloadCommercialWord(getVendorLoaWordUrl(urlParams), 'vendor-loa.docx')
      }
      if (action !== 'generate') return
      window.open(
        getVendorLoaUrl(urlParams),
        '_blank',
      )
    },
    [project?.id],
  )
  const presentCreationSuccess = useCommercialCreationSuccess({
    documentType: 'vendor-loa',
    documentLabel: 'Vendor LOA',
    projectId: project?.id,
    projectLabel: project?.project_name || `Project #${project?.id}`,
    origin,
    listOrigin: 'vendor-loa-list',
    listPath: '/commercial/vendor-loa',
    detailPath: '/commercial/vendor-loa',
    viewLabel: 'View Vendor LOA',
    listLabel: 'View Vendor LOA List',
    additionalActions: vendorLoaSuccessActions,
    onAdditionalAction: handleSuccessAction,
  })

  const payload = useMemo(
    () =>
      buildVendorLoaCreatePayload({
        project,
        selectedVendor,
        awardAmount,
        paymentTerms,
        awardPosition,
        awardRemarks,
        servicesDescription,
        venueDetails,
        feeBreakdown,
      }),
    [
      awardAmount,
      awardPosition,
      awardRemarks,
      feeBreakdown,
      paymentTerms,
      project,
      selectedVendor,
      servicesDescription,
      venueDetails,
    ],
  )

  const showCommercialDocsNotice =
    commercialDocs.loading ||
    commercialDocs.error ||
    hasProjectCommercialDocGroups(commercialDocs.groups)

  const handleReview = async () => {
    if (!selectedVendor) {
      dialog.alert('Please select a vendor first.')
      return
    }
    if (!Number.isFinite(payload.award_value) || payload.award_value <= 0) {
      dialog.alert('Please enter a valid award amount greater than 0.')
      return
    }
    if (!payload.payment_terms) {
      dialog.alert('Please select a payment term.')
      return
    }
    if (
      !(await confirmExistingCommercialDocs({
        ...commercialDocs,
        recordLabel: 'commercial records',
        createLabel: 'another vendor LOA',
        title: 'Existing Commercial Records',
      }))
    ) {
      return
    }
    setStep('review')
  }

  const handleCreate = async () => {
    if (submitting) return

    setSubmitting(true)
    try {
      const result = await saveProjectVendor(null, payload)
      if (result.status === 'success') {
        const assignmentId = getCreatedAssignmentId(result)
        await presentCreationSuccess({
          detailId: assignmentId,
          reference: selectedVendor?.vendor_name ? `for ${selectedVendor.vendor_name}` : '',
          vendorId: selectedVendor?.vendor_id,
        })
        return
      }
      dialog.alert(result.message || 'Failed to create Vendor LOA.')
    } catch (err) {
      console.error('Vendor LOA create error:', err)
      dialog.alert('Server error while creating Vendor LOA.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
        <div style={{ minWidth: 0 }}>
          <strong>Create Vendor LOA</strong>
          <div className="small text-body-secondary text-truncate">
            For project: {project.project_name || `Project #${project.id}`}
          </div>
        </div>
        <CButton
          color="secondary"
          size="sm"
          variant="outline"
          onClick={onBack}
          disabled={submitting}
        >
          {origin === 'vendor-loa-list' ? 'Back to Vendor LOA List' : 'Back to Project'}
        </CButton>
      </CCardHeader>

      {step === 'edit' && (
        <>
          {showCommercialDocsNotice && (
            <CCardBody>
              <ProjectCommercialDocsNotice
                groups={commercialDocs.groups}
                loading={commercialDocs.loading}
                error={commercialDocs.error}
                recordLabel="commercial records"
                createLabel="another vendor LOA"
              />
            </CCardBody>
          )}
          <CCardBody>
            {vendorsLoading ? (
              <DataTableLoadingState message="Loading vendors..." />
            ) : (
              <>
                {vendorsError ? (
                  <CAlert color="danger" className="mb-3">
                    {vendorsError}
                  </CAlert>
                ) : null}
                <CRow className="g-3">
                  <CCol xs={12} md={6}>
                    <CFormLabel htmlFor="vendorLoaVendor">Vendor</CFormLabel>
                    <CFormSelect
                      id="vendorLoaVendor"
                      value={selectedVendorId}
                      onChange={(event) => setSelectedVendorId(event.target.value)}
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.vendor_id} value={vendor.vendor_id}>
                          {vendor.vendor_name}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol xs={12} md={3}>
                    <CFormLabel htmlFor="vendorLoaAwardAmount">
                      Sum Professional Fee (RM)
                    </CFormLabel>
                    <CFormInput
                      id="vendorLoaAwardAmount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={awardAmount}
                      onChange={(event) => setAwardAmount(event.target.value)}
                    />
                  </CCol>
                  <CCol xs={12} md={3}>
                    <CFormLabel htmlFor="vendorLoaPaymentTerms">Payment Terms</CFormLabel>
                    <CFormSelect
                      id="vendorLoaPaymentTerms"
                      value={paymentTerms}
                      onChange={(event) => setPaymentTerms(event.target.value)}
                    >
                      <option value="">Select payment term</option>
                      {paymentTermOptions.map((term) => (
                        <option key={term} value={term}>
                          {term}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel htmlFor="vendorLoaPosition">Position</CFormLabel>
                    <CFormInput
                      id="vendorLoaPosition"
                      value={awardPosition}
                      onChange={(event) => setAwardPosition(event.target.value)}
                    />
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel htmlFor="vendorLoaServicesDescription">
                      Services Description
                    </CFormLabel>
                    <CFormTextarea
                      id="vendorLoaServicesDescription"
                      rows={2}
                      value={servicesDescription}
                      onChange={(event) => setServicesDescription(event.target.value)}
                    />
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel htmlFor="vendorLoaVenueDetails">Venue Details</CFormLabel>
                    <CFormTextarea
                      id="vendorLoaVenueDetails"
                      rows={2}
                      value={venueDetails}
                      onChange={(event) => setVenueDetails(event.target.value)}
                    />
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel htmlFor="vendorLoaFeeBreakdown">Fee Breakdown</CFormLabel>
                    <CFormTextarea
                      id="vendorLoaFeeBreakdown"
                      rows={2}
                      value={feeBreakdown}
                      onChange={(event) => setFeeBreakdown(event.target.value)}
                    />
                  </CCol>
                  <CCol xs={12}>
                    <CFormLabel htmlFor="vendorLoaRemarks">Remarks</CFormLabel>
                    <CFormTextarea
                      id="vendorLoaRemarks"
                      rows={2}
                      value={awardRemarks}
                      onChange={(event) => setAwardRemarks(event.target.value)}
                    />
                  </CCol>
                </CRow>
              </>
            )}
          </CCardBody>
          <CCardFooter className="d-flex justify-content-end gap-2">
            <CButton color="secondary" size="sm" variant="outline" onClick={onBack}>
              Cancel
            </CButton>
            <CButton
              color="primary"
              size="sm"
              onClick={handleReview}
              disabled={vendorsLoading || commercialDocs.loading}
            >
              Review Vendor LOA
            </CButton>
          </CCardFooter>
        </>
      )}

      {step === 'review' && (
        <VendorLoaReviewStep
          project={project}
          selectedVendor={selectedVendor}
          payload={payload}
          submitting={submitting}
          onBack={() => setStep('edit')}
          onCreate={handleCreate}
        />
      )}
    </CCard>
  )
}

export default VendorLoaCreateFlow
