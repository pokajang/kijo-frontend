import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { useLocation, useNavigate } from 'react-router-dom'

import {
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CButton,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'

import Select from '../../../../components/forms/ThemedSelect'
import { DataTableActionMenu, DataTableLoadingState } from '../../../../components/datatable'
import dialog from '../../../../components/dialog/dialogService'
import { showToast } from '../../../../components/toast/toastService'
import {
  getProjectLoaUrl,
  listAllVendors,
  listAssignedVendors,
  removeProjectVendor,
  saveProjectVendor,
  toFiniteNumber,
} from '../projectApi'
import { formatProjectMoney } from '../projectDetailFormatters'
import { getDetailReturnTo } from '../../../../utils/navigation/returnTo'
const PAYMENT_TERM_OPTIONS = [
  { value: '14 days', label: '14 days' },
  { value: '30 days', label: '30 days' },
  { value: '45 days', label: '45 days' },
  { value: '60 days', label: '60 days' },
]

export const buildEquipmentServicesDescription = (project = {}) => {
  if (project.project_type !== 'Equipment Supply' || !Array.isArray(project.equipment_items)) {
    return ''
  }

  return project.equipment_items
    .map((item) =>
      [
        item.item_name || '',
        item.description || '',
        item.item_remarks ? `Specifications / remarks:\n${item.item_remarks}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .filter(Boolean)
    .join('\n\n')
}

const VendorDetailsCard = ({ project, refreshKey = 0, onProgressUpdate }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const shouldOpenVendorAssignment = Boolean(location.state?.openVendorAssignment)
  const assignmentReturnTo = getDetailReturnTo(location, '')
  const createdVendorId = location.state?.createdVendorId
  const createdVendorName = location.state?.createdVendorName
  const [vendorList, setVendorList] = useState([])
  const [assigned, setAssigned] = useState([])

  const [selectedVendor, setSelectedVendor] = useState(null)
  const [editingAssignmentId, setEditingAssignmentId] = useState(null)
  const [showAwardModal, setShowAwardModal] = useState(false)

  const [awardAmount, setAwardAmount] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [awardPosition, setAwardPosition] = useState('')
  const [awardRemarks, setAwardRemarks] = useState('')

  const [servicesDescription, setServicesDescription] = useState('')
  const [venueDetails, setVenueDetails] = useState('')
  const [feeBreakdown, setFeeBreakdown] = useState('')

  const [isAwardSubmitting, setIsAwardSubmitting] = useState(false)
  const [removingAssignmentId, setRemovingAssignmentId] = useState(null)
  const [isLoadingAssigned, setIsLoadingAssigned] = useState(false)
  const [hasAutoOpenedAssignment, setHasAutoOpenedAssignment] = useState(false)

  const isEditing = useMemo(() => editingAssignmentId != null, [editingAssignmentId])
  const assignedCount = assigned.length
  const totalAwarded = useMemo(
    () => assigned.reduce((sum, vendor) => sum + toFiniteNumber(vendor.award_value), 0),
    [assigned],
  )
  const hasCustomPaymentTerm = useMemo(
    () =>
      Boolean(
        paymentTerms &&
          !PAYMENT_TERM_OPTIONS.some((option) => String(option.value) === String(paymentTerms)),
      ),
    [paymentTerms],
  )
  const equipmentServicesDescription = useMemo(
    () => buildEquipmentServicesDescription(project),
    [project],
  )
  const equipmentQuotationRemarks =
    project?.project_type === 'Equipment Supply' ? project?.quotation_remarks || '' : ''

  const resetAwardForm = useCallback(
    ({ clearVendor = true, clearEditing = true } = {}) => {
      if (clearVendor) setSelectedVendor(null)
      if (clearEditing) setEditingAssignmentId(null)

      setAwardAmount('')
      setAwardPosition('')
      setAwardRemarks(equipmentQuotationRemarks)
      setServicesDescription(equipmentServicesDescription)
      setVenueDetails('')
      setFeeBreakdown('')
      setPaymentTerms('')
    },
    [equipmentQuotationRemarks, equipmentServicesDescription],
  )

  const fetchAssignedVendors = useCallback(
    async (options = {}) => {
      if (!project?.id) return

      try {
        setIsLoadingAssigned(true)
        const vendors = await listAssignedVendors(project.id, options)
        setAssigned(vendors)
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Failed to fetch assigned vendors:', err)
        setAssigned([])
        dialog.alert(err.message || 'Failed to fetch assigned vendors')
      } finally {
        setIsLoadingAssigned(false)
      }
    },
    [project?.id],
  )

  useEffect(() => {
    const controller = new AbortController()

    const fetchVendors = async () => {
      try {
        const vendors = await listAllVendors({ signal: controller.signal })
        setVendorList(vendors)
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Failed to fetch vendors:', err)
        setVendorList([])
      }
    }

    if (project?.id) {
      fetchVendors()
      fetchAssignedVendors({ signal: controller.signal })
      resetAwardForm()
      setRemovingAssignmentId(null)
    }

    return () => {
      controller.abort()
    }
  }, [project?.id, refreshKey, fetchAssignedVendors, resetAwardForm])

  useEffect(() => {
    if (!project?.id || !shouldOpenVendorAssignment || hasAutoOpenedAssignment) return

    resetAwardForm()
    setShowAwardModal(true)
    setHasAutoOpenedAssignment(true)
  }, [hasAutoOpenedAssignment, project?.id, resetAwardForm, shouldOpenVendorAssignment])

  useEffect(() => {
    if (!showAwardModal || !createdVendorId || selectedVendor) return

    const fullVendor = vendorList.find((v) => String(v.vendor_id) === String(createdVendorId))
    setSelectedVendor(
      fullVendor || {
        vendor_id: createdVendorId,
        vendor_name: createdVendorName || 'New vendor',
      },
    )
  }, [createdVendorId, createdVendorName, selectedVendor, showAwardModal, vendorList])

  const handleConfirmAward = async () => {
    if (isAwardSubmitting) return

    if (!selectedVendor?.vendor_id || !project?.id) {
      dialog.alert('Please select a vendor first.')
      return
    }

    const parsedAwardAmount = toFiniteNumber(awardAmount, NaN)
    if (!Number.isFinite(parsedAwardAmount) || parsedAwardAmount <= 0) {
      dialog.alert('Please enter a valid award amount greater than 0.')
      return
    }
    const normalizedPaymentTerms = String(paymentTerms || '').trim()
    if (!normalizedPaymentTerms) {
      dialog.alert('Please select a payment term.')
      return
    }

    if (isEditing && !editingAssignmentId) {
      dialog.alert('Unable to update this vendor award. Please try again.')
      return
    }

    const confirmed = await dialog.confirm(
      isEditing
        ? `Save changes for ${selectedVendor.vendor_name}?`
        : `Confirm award ${selectedVendor.vendor_name}?`,
    )
    if (!confirmed) return

    setIsAwardSubmitting(true)
    try {
      const payload = {
        project_id: project.id,
        vendor_id: selectedVendor.vendor_id,
        award_value: parsedAwardAmount,
        position: awardPosition,
        remarks: awardRemarks,
        services_description: servicesDescription,
        venue_details: venueDetails,
        fee_breakdown: feeBreakdown,
        payment_terms: normalizedPaymentTerms,
      }

      if (isEditing) {
        payload.assignment_id = editingAssignmentId
      } else {
        payload.award_date = new Date().toISOString().split('T')[0]
      }

      const result = await saveProjectVendor(null, payload)
      if (result.status === 'success') {
        await fetchAssignedVendors()
        resetAwardForm()
        setShowAwardModal(false)
        showToast(isEditing ? 'Vendor assignment updated.' : 'Vendor assigned.')

        if (typeof onProgressUpdate === 'function') {
          onProgressUpdate()
        }

        if (shouldOpenVendorAssignment && assignmentReturnTo) {
          navigate(assignmentReturnTo, {
            state: {
              paymentContext: 'Project',
              paymentProjectId: project.id,
              paymentVendorId: selectedVendor.vendor_id,
              paymentVendorName: selectedVendor.vendor_name,
            },
          })
        }
      } else {
        dialog.alert(
          result.message ||
            (isEditing ? 'Failed to update vendor award' : 'Failed to assign vendor'),
        )
      }
    } catch (err) {
      console.error('Save vendor award error:', err)
      dialog.alert('Server error while saving vendor award.')
    } finally {
      setIsAwardSubmitting(false)
    }
  }

  const handleRemoveVendor = async (assignment) => {
    if (removingAssignmentId != null) return
    if (!project?.id || !assignment?.vendor_id) return

    const removeKey = String(assignment.assignment_id || `vendor-${assignment.vendor_id}`)

    const confirmed = await dialog.confirm(
      'Are you sure you want to remove this vendor from the project?',
      {
        confirmText: 'Remove',
        confirmColor: 'danger',
      },
    )
    if (!confirmed) return

    setRemovingAssignmentId(removeKey)
    try {
      const payload = {
        project_id: project.id,
        vendor_id: assignment.vendor_id,
      }
      if (assignment.assignment_id) {
        payload.assignment_id = assignment.assignment_id
      }

      const result = await removeProjectVendor(payload)
      if (result.status === 'success') {
        await fetchAssignedVendors()
        showToast('Vendor removed from project.')

        if (
          editingAssignmentId != null &&
          String(editingAssignmentId) === String(assignment.assignment_id)
        ) {
          resetAwardForm()
        }

        if (typeof onProgressUpdate === 'function') {
          onProgressUpdate()
        }
      } else {
        dialog.alert(result.message || 'Failed to remove vendor')
      }
    } catch (err) {
      console.error('Remove vendor error:', err)
      dialog.alert('Server error while removing vendor.')
    } finally {
      setRemovingAssignmentId(null)
    }
  }

  const handleEditLOA = (assignment) => {
    if (!assignment) return

    const fullVendor = vendorList.find((v) => String(v.vendor_id) === String(assignment.vendor_id))

    setSelectedVendor(
      fullVendor || {
        vendor_id: assignment.vendor_id,
        vendor_name: assignment.vendor_name,
      },
    )

    setEditingAssignmentId(assignment.assignment_id ? Number(assignment.assignment_id) : null)

    setAwardAmount(assignment.award_value || '')
    setAwardPosition(assignment.position || '')
    setAwardRemarks(assignment.remarks || '')
    setServicesDescription(assignment.services_description || '')
    setVenueDetails(assignment.venue_details || '')
    setFeeBreakdown(assignment.fee_breakdown || '')
    setPaymentTerms(assignment.payment_terms || '')
    setShowAwardModal(true)
  }

  const handleGenerateLOA = (assignment) => {
    if (!project?.id || !assignment?.vendor_id) return

    window.open(getProjectLoaUrl(project.id, assignment), '_blank')
  }

  const handleCancelAward = () => {
    if (isAwardSubmitting) return
    resetAwardForm()
    setShowAwardModal(false)
  }

  return (
    <>
      <CCardHeader className="rounded-0 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-baseline gap-2">
          <strong>Vendor Details</strong>
          <small className="text-muted">
            ({assignedCount}) | Total Awarded {formatProjectMoney(totalAwarded)}
          </small>
        </div>
        <CButton
          color="primary"
          size="sm"
          onClick={() => {
            resetAwardForm()
            setShowAwardModal(true)
          }}
        >
          Assign Vendor
        </CButton>
      </CCardHeader>

      <CCardBody>
        <div className="mt-3 data-table-embedded-shell">
          {/* datatable-exempt: existing embedded/layout table */}
          <CTable hover className="data-table-compact embedded-data-table">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>#</CTableHeaderCell>
                <CTableHeaderCell>Vendor</CTableHeaderCell>
                <CTableHeaderCell>Contact</CTableHeaderCell>
                <CTableHeaderCell>Position</CTableHeaderCell>
                <CTableHeaderCell>Award (RM)</CTableHeaderCell>
                <CTableHeaderCell>Breakdown</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>

            <CTableBody>
              {isLoadingAssigned ? (
                <CTableRow>
                  <CTableDataCell colSpan={7} className="text-center text-muted">
                    <DataTableLoadingState message="Loading vendors..." />
                  </CTableDataCell>
                </CTableRow>
              ) : assigned.length === 0 ? (
                <CTableRow>
                  <CTableDataCell colSpan={7} className="text-center text-muted">
                    No vendors assigned to this project.
                  </CTableDataCell>
                </CTableRow>
              ) : (
                assigned.map((v, i) => {
                  const rowKey = String(v.assignment_id || `${v.vendor_id}-${i}`)
                  const rowRemoving = removingAssignmentId === rowKey

                  return (
                    <CTableRow key={rowKey}>
                      <CTableHeaderCell>{i + 1}</CTableHeaderCell>

                      <CTableDataCell>
                        {v.vendor_name}
                        <br />
                        <small className="text-muted">{v.contact_person_name || '-'}</small>
                      </CTableDataCell>

                      <CTableDataCell>
                        {v.mobile_number || '-'}
                        <br />
                        <small className="text-muted">{v.email || '-'}</small>
                      </CTableDataCell>

                      <CTableDataCell>{v.position || '-'}</CTableDataCell>

                      <CTableDataCell>{formatProjectMoney(v.award_value)}</CTableDataCell>

                      <CTableDataCell>
                        {v.fee_breakdown
                          ? v.fee_breakdown
                              .split('\n')
                              .map((line, idx) => <div key={idx}>{line}</div>)
                          : '-'}
                      </CTableDataCell>

                      <CTableDataCell className="text-end">
                        <DataTableActionMenu
                          record={v}
                          actions={[
                            {
                              key: 'edit-loa',
                              label: 'Edit LOA',
                              disabled: isAwardSubmitting || removingAssignmentId != null,
                              onClick: () => handleEditLOA(v),
                            },
                            {
                              key: 'generate-loa',
                              label: 'Generate LOA',
                              disabled: isAwardSubmitting || removingAssignmentId != null,
                              onClick: () => handleGenerateLOA(v),
                            },
                            {
                              key: 'remove-vendor',
                              label: rowRemoving ? 'Removing...' : 'Remove Vendor',
                              danger: true,
                              dividerBefore: true,
                              disabled: isAwardSubmitting || removingAssignmentId != null,
                              onClick: () => handleRemoveVendor(v),
                            },
                          ]}
                          ariaLabel="Vendor actions"
                        />
                      </CTableDataCell>
                    </CTableRow>
                  )
                })
              )}
            </CTableBody>
          </CTable>
        </div>
      </CCardBody>

      <CModal visible={showAwardModal} onClose={handleCancelAward} alignment="center" size="lg">
        <CModalHeader closeButton>
          <CModalTitle>{isEditing ? 'Edit Vendor Assignment' : 'Assign Vendor'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="mb-3">
            <CCol md={12}>
              <CFormLabel>Assign Vendor</CFormLabel>
              <Select
                options={vendorList.map((v) => ({
                  value: v.vendor_id,
                  label: v.vendor_name,
                }))}
                value={
                  selectedVendor
                    ? { value: selectedVendor.vendor_id, label: selectedVendor.vendor_name }
                    : null
                }
                onChange={(option) => {
                  if (!option) {
                    resetAwardForm()
                    return
                  }

                  const fullVendor = vendorList.find(
                    (v) => String(v.vendor_id) === String(option.value),
                  )
                  if (isEditing) {
                    setSelectedVendor(
                      fullVendor || { vendor_id: option.value, vendor_name: option.label },
                    )
                  } else {
                    resetAwardForm()
                    setSelectedVendor(
                      fullVendor || { vendor_id: option.value, vendor_name: option.label },
                    )
                  }
                }}
                isDisabled={isAwardSubmitting || removingAssignmentId != null}
                isClearable
                placeholder="Select a vendor"
                noOptionsMessage={() => (
                  <span>
                    No vendors found.{' '}
                    <CButton
                      color="primary"
                      size="sm"
                      className="p-1 m-0 align-baseline"
                      onClick={() =>
                        navigate('/vendor/create', {
                          state: {
                            returnTo: `${location.pathname}${location.search}${location.hash}`,
                            returnState: {
                              ...location.state,
                              openVendorAssignment: true,
                              returnTo: assignmentReturnTo,
                              paymentProjectId: project?.id,
                            },
                          },
                        })
                      }
                    >
                      Create one?
                    </CButton>
                  </span>
                )}
              />
            </CCol>
          </CRow>

          {selectedVendor && (
            <>
              <CRow className="mb-3">
                <CCol md={4}>
                  <CFormLabel>Sum Professional Fee (RM)</CFormLabel>
                  <CFormInput
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={awardAmount}
                    onChange={(e) => setAwardAmount(e.target.value)}
                    placeholder="e.g. 2000.00"
                  />
                </CCol>

                <CCol md={4}>
                  <CFormLabel>Payment Terms</CFormLabel>
                  <CFormSelect
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  >
                    <option value="">Select payment term</option>
                    {hasCustomPaymentTerm && (
                      <option value={paymentTerms}>{paymentTerms} (current)</option>
                    )}
                    {PAYMENT_TERM_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Position</CFormLabel>
                  <CFormInput
                    value={awardPosition}
                    onChange={(e) => setAwardPosition(e.target.value)}
                    placeholder="e.g. Lead Internal Auditor for ..."
                  />
                </CCol>
              </CRow>

              <CRow className="mb-3">
                <CCol md={6}>
                  <CFormLabel>Services Description</CFormLabel>
                  <CFormTextarea
                    rows={8}
                    maxLength={1000000}
                    value={servicesDescription}
                    onChange={(e) => setServicesDescription(e.target.value)}
                    placeholder="e.g. To lead and conduct internal audit ..."
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Venue Details</CFormLabel>
                  <CFormTextarea
                    rows={2}
                    maxLength={5000}
                    value={venueDetails}
                    onChange={(e) => setVenueDetails(e.target.value)}
                    placeholder="e.g Monash Subang"
                  />
                </CCol>
              </CRow>

              <CRow className="mb-3">
                <CCol md={6}>
                  <CFormLabel>Fee Breakdown</CFormLabel>
                  <CFormTextarea
                    rows={2}
                    value={feeBreakdown}
                    onChange={(e) => setFeeBreakdown(e.target.value)}
                    placeholder={
                      'e.g.\nProfessional Fee - RM 1000\nReport - RM 400\nTransport - RM 150'
                    }
                  />
                </CCol>

                <CCol md={6}>
                  <CFormLabel>Remarks (If Any)</CFormLabel>
                  <CFormTextarea
                    rows={2}
                    value={awardRemarks}
                    onChange={(e) => setAwardRemarks(e.target.value)}
                    placeholder="e.g. Tentative service date 12/05/2005"
                  />
                </CCol>
              </CRow>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            size="sm"
            variant="outline"
            onClick={handleCancelAward}
            disabled={isAwardSubmitting}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            size="sm"
            onClick={handleConfirmAward}
            disabled={
              !selectedVendor ||
              !awardAmount ||
              !String(paymentTerms || '').trim() ||
              isAwardSubmitting ||
              removingAssignmentId != null
            }
          >
            {isAwardSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Confirm Award'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

VendorDetailsCard.propTypes = {
  project: PropTypes.object,
  refreshKey: PropTypes.number,
  onProgressUpdate: PropTypes.func,
}

export default VendorDetailsCard
