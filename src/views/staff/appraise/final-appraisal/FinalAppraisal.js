import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { DataTableLoadingState } from '../../../../components/datatable'
import StaffSelector from '../StaffSelector'
import {
  createFinalAppraisal,
  fetchAppraisalRecords,
  fetchFinalAppraisal,
  updateFinalAppraisal,
} from '../actionHandlers'
import dialog from '../../../../components/dialog/dialogService'

const ratingOptions = [
  { value: '5', label: '5 - Excellent' },
  { value: '4', label: '4 - Very Good' },
  { value: '3', label: '3 - Satisfactory' },
  { value: '2', label: '2 - Needs Improvement' },
  { value: '1', label: '1 - Poor' },
]

const initialFormData = {
  selectedStaff: '',
  appraisalDate: new Date().toISOString().slice(0, 10),
  workQuality: '',
  teamwork: '',
  leadership: '',
  overallPerformance: '',
  supervisorComments: '',
  salaryIncrementRecommendation: '',
  promotionRecommendation: '',
}

const normalizeRecordToForm = (record) => ({
  selectedStaff: record?.staff_id || '',
  appraisalDate: record?.appraisal_date || new Date().toISOString().slice(0, 10),
  workQuality: record?.work_quality ? String(record.work_quality) : '',
  teamwork: record?.teamwork ? String(record.teamwork) : '',
  leadership: record?.leadership ? String(record.leadership) : '',
  overallPerformance: record?.overall_performance ? String(record.overall_performance) : '',
  supervisorComments: record?.supervisor_comments || '',
  salaryIncrementRecommendation: record?.salary_increment_recommendation || '',
  promotionRecommendation: record?.promotion_recommendation || '',
})

const formatPerson = (record, prefix) =>
  `${record?.[`${prefix}_name`] || '-'} (${record?.[`${prefix}_code`] || '-'})${
    record?.[`${prefix}_position`] ? `, ${record[`${prefix}_position`]}` : ''
  }${record?.[`${prefix}_department`] ? `, ${record[`${prefix}_department`]}` : ''}`

const FinalAppraisal = () => {
  const { finalAppraisalId } = useParams()
  const isEditMode = Boolean(finalAppraisalId)
  const navigate = useNavigate()
  const [formData, setFormData] = useState(initialFormData)
  const [loadingRecord, setLoadingRecord] = useState(isEditMode)
  const [previousLoading, setPreviousLoading] = useState(false)
  const [previousError, setPreviousError] = useState('')
  const [previousEvaluations, setPreviousEvaluations] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const goBack = useCallback(() => navigate('/staff/appraise'), [navigate])

  const loadPreviousEvaluations = useCallback(async (staffId) => {
    if (!staffId) {
      setPreviousEvaluations([])
      setPreviousError('')
      return
    }

    setPreviousLoading(true)
    setPreviousError('')
    try {
      const records = await fetchAppraisalRecords(staffId, '', { throwOnError: true })
      setPreviousEvaluations(records)
    } catch (err) {
      setPreviousEvaluations([])
      setPreviousError(err?.message || 'Failed to load previous evaluations.')
    } finally {
      setPreviousLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isEditMode) return

    const loadRecord = async () => {
      setLoadingRecord(true)
      try {
        const record = await fetchFinalAppraisal(finalAppraisalId)
        const normalized = normalizeRecordToForm(record)
        setFormData(normalized)
        await loadPreviousEvaluations(normalized.selectedStaff)
      } catch (err) {
        dialog.alert(err?.message || 'Failed to load final appraisal.')
        goBack()
      } finally {
        setLoadingRecord(false)
      }
    }

    loadRecord()
  }, [finalAppraisalId, goBack, isEditMode, loadPreviousEvaluations])

  const normalizedPreviousEvaluations = useMemo(
    () =>
      previousEvaluations.map((record) => ({
        ...record,
        eventDate: record.event_date || '',
        type: record.section || '-',
        appraisedBy: formatPerson(record, 'creator'),
        feedback: record.feedback || '-',
      })),
    [previousEvaluations],
  )

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleStaffChange = (event) => {
    const staffId = event.target.value
    setFormData((prev) => ({ ...prev, selectedStaff: staffId }))
    loadPreviousEvaluations(staffId)
  }

  const validateForm = () => {
    if (!formData.selectedStaff) return 'Please select staff.'
    if (!formData.appraisalDate) return 'Please select appraisal date.'
    if (
      !formData.workQuality ||
      !formData.teamwork ||
      !formData.leadership ||
      !formData.overallPerformance
    ) {
      return 'Please complete all rating fields.'
    }
    if (!formData.supervisorComments.trim()) return 'Please enter supervisor comments.'
    return ''
  }

  const buildPayload = () => ({
    staffId: formData.selectedStaff,
    appraisalDate: formData.appraisalDate,
    workQuality: formData.workQuality,
    teamwork: formData.teamwork,
    leadership: formData.leadership,
    overallPerformance: formData.overallPerformance,
    supervisorComments: formData.supervisorComments.trim(),
    salaryIncrementRecommendation: formData.salaryIncrementRecommendation.trim() || null,
    promotionRecommendation: formData.promotionRecommendation.trim() || null,
  })

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      dialog.alert(validationError)
      return
    }

    const confirmed = await dialog.confirm(
      `${isEditMode ? 'Update' : 'Submit'} final appraisal for staff ID ${formData.selectedStaff}?`,
    )
    if (!confirmed) return

    setSubmitting(true)
    try {
      if (isEditMode) {
        await updateFinalAppraisal(finalAppraisalId, buildPayload())
        dialog.alert('Final appraisal updated successfully.')
      } else {
        await createFinalAppraisal(buildPayload())
        dialog.alert('Final appraisal submitted successfully.')
      }
      goBack()
    } catch (err) {
      dialog.alert(err?.message || 'Failed to save final appraisal.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
        <strong>{isEditMode ? 'Edit Final Appraisal' : 'Final Appraisal Evaluation'}</strong>
        <CButton color="secondary" variant="outline" size="sm" onClick={goBack}>
          Back
        </CButton>
      </CCardHeader>
      <CCardBody>
        {loadingRecord ? (
          <DataTableLoadingState message="Loading final appraisal..." />
        ) : (
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              <CCol xs={12} md={6}>
                <CFormLabel>Staff Name</CFormLabel>
                <StaffSelector
                  name="selectedStaff"
                  value={formData.selectedStaff}
                  onChange={handleStaffChange}
                  disabled={isEditMode}
                />
              </CCol>
              <CCol xs={12} md={3}>
                <CFormLabel htmlFor="appraisalDate">Appraisal Date</CFormLabel>
                <CFormInput
                  type="date"
                  id="appraisalDate"
                  name="appraisalDate"
                  value={formData.appraisalDate}
                  onChange={handleInputChange}
                />
              </CCol>

              {formData.selectedStaff && (
                <CCol xs={12}>
                  <CFormLabel>Previous Evaluations</CFormLabel>
                  {previousLoading ? (
                    <DataTableLoadingState message="Loading previous evaluations..." />
                  ) : previousError ? (
                    <CAlert color="danger">{previousError}</CAlert>
                  ) : normalizedPreviousEvaluations.length > 0 ? (
                    <CTable
                      hover
                      bordered
                      responsive
                      className="data-table-compact embedded-data-table"
                    >
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Date</CTableHeaderCell>
                          <CTableHeaderCell>Type</CTableHeaderCell>
                          <CTableHeaderCell>Appraised By</CTableHeaderCell>
                          <CTableHeaderCell>Feedback</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {normalizedPreviousEvaluations.map((evaluation) => (
                          <CTableRow key={evaluation.id}>
                            <CTableDataCell>{evaluation.eventDate || '-'}</CTableDataCell>
                            <CTableDataCell>{evaluation.type}</CTableDataCell>
                            <CTableDataCell>{evaluation.appraisedBy}</CTableDataCell>
                            <CTableDataCell>{evaluation.feedback}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  ) : (
                    <div className="py-3 text-center text-muted border rounded">
                      No previous evaluations found for this staff.
                    </div>
                  )}
                </CCol>
              )}

              <CCol xs={12} md={3}>
                <CFormLabel htmlFor="workQuality">Work Quality</CFormLabel>
                <CFormSelect
                  id="workQuality"
                  name="workQuality"
                  value={formData.workQuality}
                  onChange={handleInputChange}
                >
                  <option value="">Select Rating</option>
                  {ratingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={3}>
                <CFormLabel htmlFor="teamwork">Teamwork & Collaboration</CFormLabel>
                <CFormSelect
                  id="teamwork"
                  name="teamwork"
                  value={formData.teamwork}
                  onChange={handleInputChange}
                >
                  <option value="">Select Rating</option>
                  {ratingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={3}>
                <CFormLabel htmlFor="leadership">Leadership & Initiative</CFormLabel>
                <CFormSelect
                  id="leadership"
                  name="leadership"
                  value={formData.leadership}
                  onChange={handleInputChange}
                >
                  <option value="">Select Rating</option>
                  {ratingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={3}>
                <CFormLabel htmlFor="overallPerformance">Overall Performance</CFormLabel>
                <CFormSelect
                  id="overallPerformance"
                  name="overallPerformance"
                  value={formData.overallPerformance}
                  onChange={handleInputChange}
                >
                  <option value="">Select Rating</option>
                  {ratingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol xs={12}>
                <CFormLabel htmlFor="supervisorComments">Supervisor Comments</CFormLabel>
                <CFormTextarea
                  id="supervisorComments"
                  name="supervisorComments"
                  value={formData.supervisorComments}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Summarize final appraisal outcomes."
                />
              </CCol>
              <CCol xs={12} md={6}>
                <CFormLabel htmlFor="salaryIncrementRecommendation">
                  Salary Increment Recommendation
                </CFormLabel>
                <CFormInput
                  id="salaryIncrementRecommendation"
                  name="salaryIncrementRecommendation"
                  value={formData.salaryIncrementRecommendation}
                  onChange={handleInputChange}
                  placeholder="e.g. 5% or RM 300"
                />
              </CCol>
              <CCol xs={12} md={6}>
                <CFormLabel htmlFor="promotionRecommendation">Promotion Recommendation</CFormLabel>
                <CFormInput
                  id="promotionRecommendation"
                  name="promotionRecommendation"
                  value={formData.promotionRecommendation}
                  onChange={handleInputChange}
                  placeholder="e.g. Senior Executive"
                />
              </CCol>
              <CCol xs={12}>
                <CButton type="submit" color="primary" disabled={submitting}>
                  {submitting
                    ? 'Saving...'
                    : isEditMode
                      ? 'Update Final Appraisal'
                      : 'Submit Final Appraisal'}
                </CButton>
              </CCol>
            </CRow>
          </CForm>
        )}
      </CCardBody>
    </CCard>
  )
}

export default FinalAppraisal
