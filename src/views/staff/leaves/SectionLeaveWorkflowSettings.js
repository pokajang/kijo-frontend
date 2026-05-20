import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormLabel,
  CRow,
} from '@coreui/react'
import Select from '../../../components/forms/ThemedSelect'
import * as AH from './actionHandlers'

const getStageStaffIds = (stage) =>
  Array.isArray(stage?.recipients)
    ? stage.recipients.map((recipient) => Number(recipient.staff_id)).filter(Boolean)
    : []

const formatRecipient = (recipient) =>
  `${recipient.full_name || recipient.name_code || recipient.email || 'Staff'}${
    recipient.name_code ? ` (${recipient.name_code})` : ''
  }${recipient.email ? ` - ${recipient.email}` : ''}`

const SectionLeaveWorkflowSettings = ({ staffList = [], onBack }) => {
  const [stages, setStages] = useState([])
  const [selectedByStage, setSelectedByStage] = useState({})
  const [lastSavedByStage, setLastSavedByStage] = useState({})
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const staffOptions = useMemo(
    () =>
      staffList
        .filter((staff) => !staff.status || String(staff.status).toLowerCase() === 'active')
        .map((staff) => ({
          value: Number(staff.staff_id),
          label: `${staff.full_name || staff.name_code || staff.email || 'Staff'}${
            staff.name_code ? ` (${staff.name_code})` : ''
          }${staff.email ? ` - ${staff.email}` : ''}`,
        })),
    [staffList],
  )

  const optionByStaffId = useMemo(
    () => new Map(staffOptions.map((option) => [option.value, option])),
    [staffOptions],
  )

  useEffect(() => {
    let cancelled = false

    const loadWorkflow = async () => {
      try {
        setLoading(true)
        setNotice(null)
        const items = await AH.getLeaveWorkflowRecipients()
        if (cancelled) return

        setStages(items)
        const nextSelected = Object.fromEntries(
          items.map((stage) => [stage.key, getStageStaffIds(stage)]),
        )
        setSelectedByStage(nextSelected)
        setLastSavedByStage(nextSelected)
      } catch (err) {
        if (!cancelled) {
          setNotice({
            color: 'danger',
            message: err?.message || 'Could not load leave workflow recipients.',
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadWorkflow()
    return () => {
      cancelled = true
    }
  }, [])

  const handleStageChange = (stageKey, selectedOptions = []) => {
    setSelectedByStage((prev) => ({
      ...prev,
      [stageKey]: selectedOptions.map((option) => Number(option.value)).filter(Boolean),
    }))
  }

  const handleSave = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      setNotice(null)
      const payload = Object.fromEntries(
        stages.map((stage) => [stage.key, selectedByStage[stage.key] || []]),
      )
      const result = await AH.updateLeaveWorkflowRecipients(payload)
      const updatedStages = Array.isArray(result.stages) ? result.stages : stages
      setStages(updatedStages)
      const nextSelected = Object.fromEntries(
        updatedStages.map((stage) => [stage.key, getStageStaffIds(stage)]),
      )
      setSelectedByStage(nextSelected)
      setLastSavedByStage(nextSelected)
      setIsEditing(false)
      setNotice({ color: 'success', message: 'Leave email workflow saved.' })
    } catch (err) {
      setNotice({
        color: 'danger',
        message: err?.message || 'Failed to save leave workflow recipients.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = () => {
    setNotice(null)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setSelectedByStage(lastSavedByStage)
    setIsEditing(false)
    setNotice(null)
  }

  const getDisplayRecipients = (stage) => {
    const effectiveRecipients = Array.isArray(stage.effective_recipients)
      ? stage.effective_recipients
      : []

    if (effectiveRecipients.length) {
      return effectiveRecipients.map(formatRecipient).join(', ')
    }

    const selectedOptions = (selectedByStage[stage.key] || [])
      .map((staffId) => optionByStaffId.get(Number(staffId)))
      .filter(Boolean)

    return selectedOptions.length ? selectedOptions.map((option) => option.label).join(', ') : '-'
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
        <strong>Leave Approval Workflow</strong>
        <div className="d-flex align-items-center gap-2">
          {onBack && (
            <CButton color="secondary" variant="outline" size="sm" onClick={onBack}>
              Back
            </CButton>
          )}
        </div>
      </CCardHeader>
      <CCardBody>
        {notice && (
          <CAlert color={notice.color} className="py-2">
            {notice.message}
          </CAlert>
        )}

        {isEditing ? (
          <CForm onSubmit={handleSave}>
            <CRow className="g-3">
              {stages.map((stage) => {
                const selectedOptions = (selectedByStage[stage.key] || [])
                  .map((staffId) => optionByStaffId.get(Number(staffId)))
                  .filter(Boolean)

                return (
                  <CCol xs={12} lg={6} key={stage.key}>
                    <CFormLabel className="mb-1">{stage.label}</CFormLabel>
                    <Select
                      options={staffOptions}
                      value={selectedOptions}
                      onChange={(options) => handleStageChange(stage.key, options || [])}
                      placeholder="Select staff recipients..."
                      isMulti
                      isSearchable
                      isDisabled={saving || loading}
                    />
                  </CCol>
                )
              })}
            </CRow>

            <div className="d-flex justify-content-end gap-2 mt-3">
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel
              </CButton>
              <CButton type="submit" color="primary" size="sm" disabled={saving || loading}>
                {saving ? 'Saving...' : 'Save Workflow'}
              </CButton>
            </div>
          </CForm>
        ) : (
          <CRow className="g-3">
            {stages.map((stage) => (
              <CCol xs={12} lg={6} key={stage.key}>
                <div className="text-muted small mb-1">{stage.label}</div>
                <div>{getDisplayRecipients(stage)}</div>
              </CCol>
            ))}
            <CCol xs={12}>
              <div className="d-flex justify-content-end">
                <CButton color="primary" size="sm" onClick={handleEdit} disabled={loading}>
                  Edit
                </CButton>
              </div>
            </CCol>
          </CRow>
        )}
      </CCardBody>
    </CCard>
  )
}

export default SectionLeaveWorkflowSettings
