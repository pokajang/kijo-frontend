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
  CFormCheck,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import Select from '../../../components/forms/ThemedSelect'
import { fetchWorkflowTemplate, fetchWorkflowTemplates, saveWorkflowTemplate } from './workflowApi'

export const workflowTabs = [
  { key: 'salary-application', label: 'Salary', to: '/workflows/salary-application' },
  { key: 'vendor-payment', label: 'Vendor Payment', to: '/workflows/vendor-payment' },
  { key: 'leave-application', label: 'Leave Application', to: '/workflows/leave-application' },
  { key: 'quote-price-exception', label: 'Negotiation', to: '/workflows/quote-price-exception' },
]

const workflowHeaderText = {
  'salary-application': {
    title: 'Salary Approval Setup',
  },
  'vendor-payment': {
    title: 'Vendor Payment Setup',
  },
  'leave-application': {
    title: 'Leave Approval Setup',
  },
  'quote-price-exception': {
    title: 'Negotiation Approval Setup',
  },
}

const workflowIntroText = {
  'salary-application':
    'Choose who checks and approves salary claims. Checkers review the submitted salary month, claims, and attachments first. Approvers give the final approval after checking is done.',
  'vendor-payment':
    'Choose who reviews, approves, and handles vendor payment requests. Reviewers check the request details, approvers give the go-ahead, and finance handles the final payment step.',
  'leave-application':
    'Choose who handles staff leave applications. The first person reviews the leave request, the next person recommends it when needed, and the final approver confirms the leave decision.',
  'quote-price-exception':
    'Choose who approves negotiation or price exception requests. The approver checks the requested discount or price change before it can be used in the quotation.',
}

const staffLabel = (staff) =>
  staff?.full_name && staff?.name_code
    ? `${staff.full_name} (${staff.name_code})`
    : staff?.full_name || staff?.name_code || `Staff #${staff?.staff_id || '-'}`

const toStaffOptions = (staff) =>
  staff.map((item) => ({ value: Number(item.staff_id), label: staffLabel(item) }))

const workflowStepDraft = (step) => ({
  ...step,
  recipient_staff_ids: Array.isArray(step.recipient_staff_ids)
    ? step.recipient_staff_ids.map((id) => Number(id))
    : (step.recipients || []).map((recipient) => Number(recipient.staff_id)),
})

const buildVendorStepDrafts = (settings = {}, steps = []) => {
  const existingByKey = new Map(
    steps.map((step) => [`${step.stepKey}.${Number(step.levelNo) || 1}`, workflowStepDraft(step)]),
  )
  const draftRows = []
  const addStep = (stepKey, levelNo, label) => {
    const key = `${stepKey}.${levelNo}`
    const existing = existingByKey.get(key) || {}
    draftRows.push({
      ...existing,
      id: existing.id || key,
      stepKey,
      levelNo,
      label,
      actionLabel: label,
      fallbackLabel: existing.fallbackLabel || 'Using module fallback recipients',
      recipients: existing.recipients || [],
      effectiveRecipients: existing.effectiveRecipients || [],
      usingDefault: existing.usingDefault ?? true,
    })
  }

  if (settings.review_enabled) {
    const levels = Math.max(1, Number(settings.review_levels) || 1)
    for (let level = 1; level <= levels; level += 1) {
      addStep('review', level, levels > 1 ? `Review Level ${level}` : 'Review')
    }
  }
  if (settings.approval_enabled) {
    const levels = Math.max(1, Number(settings.approval_levels) || 1)
    for (let level = 1; level <= levels; level += 1) {
      addStep('approval', level, levels > 1 ? `Approval Level ${level}` : 'Approval')
    }
  }
  addStep('finance', 1, 'Finance')

  return draftRows
}

const WorkflowsPage = () => {
  const { templateKey } = useParams()
  const navigate = useNavigate()
  const activeTab = templateKey || 'salary-application'
  const [templates, setTemplates] = useState([])
  const [template, setTemplate] = useState(null)
  const [activeStaff, setActiveStaff] = useState([])
  const [draftSteps, setDraftSteps] = useState([])
  const [vendorSettings, setVendorSettings] = useState({
    review_enabled: true,
    review_levels: 1,
    approval_enabled: true,
    approval_levels: 1,
  })
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)

  const setVendorSettingsAndSteps = useCallback((updater) => {
    setVendorSettings((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      setDraftSteps((steps) => buildVendorStepDrafts(next, steps))
      return next
    })
  }, [])

  const loadTemplates = useCallback(async () => {
    try {
      const payload = await fetchWorkflowTemplates()
      setTemplates(payload.templates)
      setCanEdit(payload.canEdit)
    } catch {
      setTemplates([])
    }
  }, [])

  const loadTemplate = useCallback(async (key) => {
    setLoading(true)
    setNotice(null)
    try {
      const payload = await fetchWorkflowTemplate(key)
      setTemplate(payload.template)
      setActiveStaff(payload.activeStaff)
      setCanEdit(payload.canEdit)
      if (payload.template?.settings) {
        setVendorSettings(payload.template.settings)
        setDraftSteps(
          buildVendorStepDrafts(payload.template.settings, payload.template?.steps || []),
        )
      } else {
        setDraftSteps((payload.template?.steps || []).map(workflowStepDraft))
      }
    } catch (err) {
      setNotice({ color: 'danger', message: err?.message || 'Unable to load workflow settings.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  useEffect(() => {
    if (templateKey) {
      loadTemplate(templateKey)
      return
    }
    navigate('/workflows/salary-application', { replace: true })
  }, [loadTemplate, navigate, templateKey])

  const staffOptions = useMemo(() => toStaffOptions(activeStaff), [activeStaff])

  const cardHeaderText = useMemo(() => {
    if (workflowHeaderText[activeTab]) return workflowHeaderText[activeTab]

    const label = template?.label || templates.find((item) => item.key === activeTab)?.label
    return {
      title: label ? `${label} Setup` : 'Workflow Setup',
    }
  }, [activeTab, template?.label, templates])

  const setStepRecipients = (stepId, options) => {
    const ids = (options || []).map((option) => Number(option.value))
    setDraftSteps((current) =>
      current.map((step) =>
        String(step.id) === String(stepId) ? { ...step, recipient_staff_ids: ids } : step,
      ),
    )
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!templateKey || !template) return

    const payload = {
      settings: template.adapter === 'vendor' ? vendorSettings : undefined,
      steps: draftSteps.map((step) => ({
        id: step.id,
        stepKey: step.stepKey,
        levelNo: step.levelNo,
        recipient_staff_ids: step.recipient_staff_ids || [],
      })),
    }

    try {
      setLoading(true)
      const saved = await saveWorkflowTemplate(templateKey, payload)
      setNotice({ color: 'success', message: saved.message || 'Workflow settings saved.' })
      await loadTemplate(templateKey)
    } catch (err) {
      setNotice({ color: 'danger', message: err?.message || 'Unable to save workflow settings.' })
    } finally {
      setLoading(false)
    }
  }

  const renderVendorSettings = () =>
    template?.adapter === 'vendor' ? (
      <CRow className="g-3 mb-3">
        <CCol xs={12} md={3}>
          <CFormCheck
            id="workflowVendorReviewEnabled"
            label="Review enabled"
            checked={Boolean(vendorSettings.review_enabled)}
            disabled={!canEdit}
            onChange={(event) =>
              setVendorSettingsAndSteps((current) => ({
                ...current,
                review_enabled: event.target.checked,
              }))
            }
          />
        </CCol>
        <CCol xs={12} md={3}>
          <CFormLabel htmlFor="workflowVendorReviewLevels">Review levels</CFormLabel>
          <CFormSelect
            id="workflowVendorReviewLevels"
            size="sm"
            value={vendorSettings.review_levels}
            disabled={!canEdit || !vendorSettings.review_enabled}
            onChange={(event) =>
              setVendorSettingsAndSteps((current) => ({
                ...current,
                review_levels: Number(event.target.value),
              }))
            }
          >
            {[1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </CFormSelect>
        </CCol>
        <CCol xs={12} md={3}>
          <CFormCheck
            id="workflowVendorApprovalEnabled"
            label="Approval enabled"
            checked={Boolean(vendorSettings.approval_enabled)}
            disabled={!canEdit}
            onChange={(event) =>
              setVendorSettingsAndSteps((current) => ({
                ...current,
                approval_enabled: event.target.checked,
              }))
            }
          />
        </CCol>
        <CCol xs={12} md={3}>
          <CFormLabel htmlFor="workflowVendorApprovalLevels">Approval levels</CFormLabel>
          <CFormSelect
            id="workflowVendorApprovalLevels"
            size="sm"
            value={vendorSettings.approval_levels}
            disabled={!canEdit || !vendorSettings.approval_enabled}
            onChange={(event) =>
              setVendorSettingsAndSteps((current) => ({
                ...current,
                approval_levels: Number(event.target.value),
              }))
            }
          >
            {[1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </CFormSelect>
        </CCol>
      </CRow>
    ) : null

  const renderSettings = () => (
    <CForm onSubmit={handleSave}>
      {!canEdit && (
        <div className="text-muted small mb-3">
          Workflow settings are read-only. Only Manager and System Admin users can edit.
        </div>
      )}
      <div className="workflow-settings-intro">
        {workflowIntroText[activeTab] || 'Choose who should handle this workflow.'}
      </div>
      {renderVendorSettings()}
      <div className="workflow-settings-steps">
        {draftSteps.map((step) => {
          const selectedOptions = staffOptions.filter((option) =>
            (step.recipient_staff_ids || []).includes(Number(option.value)),
          )
          return (
            <div key={step.id} className="workflow-settings-step">
              <CRow className="g-3 align-items-center">
                <CCol xs={12} lg={3}>
                  <div className="workflow-settings-step__title">{step.label}</div>
                  {step.description && <div className="text-muted small">{step.description}</div>}
                  <div className="workflow-settings-step__fallback">
                    Fallback: {step.fallbackLabel || '-'}
                  </div>
                </CCol>
                <CCol xs={12} lg={9}>
                  <Select
                    aria-label={`Named staff recipients for ${step.label}`}
                    options={staffOptions}
                    value={selectedOptions}
                    onChange={(options) => setStepRecipients(step.id, options || [])}
                    placeholder="Select staff or use fallback roles..."
                    isMulti
                    isSearchable
                    isDisabled={!canEdit}
                  />
                </CCol>
              </CRow>
            </div>
          )
        })}
      </div>
      <div className="d-flex justify-content-end gap-2 mt-3">
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={() => navigate('/workflows')}
        >
          Back
        </CButton>
        <CButton color="primary" size="sm" type="submit" disabled={!canEdit || loading}>
          Save Settings
        </CButton>
      </div>
    </CForm>
  )

  return (
    <>
      <ModuleNavStrip tabs={workflowTabs} activeTab={activeTab} ariaLabel="Workflow sections" />
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4 records-page-card">
            <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap records-page-card-header">
              <strong>{cardHeaderText.title}</strong>
            </CCardHeader>
            <CCardBody className="records-page-card-body">
              {notice && (
                <CAlert color={notice.color} className="py-2">
                  {notice.message}
                </CAlert>
              )}
              {renderSettings()}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default WorkflowsPage
