import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'
import { DataTableLoadingState } from '../../../components/datatable'
import { listAllProjects } from '../../project/manage/projectApi'

import { listLegalComplianceTemplates } from './api/legalComplianceApi'
import LegalComplianceTemplateGrid from './LegalComplianceTemplateGrid'
import { clearLocalDraft } from './utils/assessmentDraftStorage'
import {
  ASSESSMENT_TIERS,
  getAssessmentTierMeta,
  normalizeAssessmentTier,
} from './legalComplianceTemplateUtils'

const LegalComplianceTemplateSelector = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [templates, setTemplates] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedTier, setSelectedTier] = useState(null)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [paidProjectMode, setPaidProjectMode] = useState('none')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [error, setError] = useState(() => location.state?.error || '')
  const [notice, setNotice] = useState(() => location.state?.error || '')

  useEffect(() => {
    let isMounted = true

    ;(async () => {
      try {
        setIsLoading(true)
        setError('')
        const payload = await listLegalComplianceTemplates()
        if (!isMounted) return
        setTemplates(
          (Array.isArray(payload.templates) ? payload.templates : []).filter(
            (template) => template.active_version_id,
          ),
        )
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'Could not load legal compliance templates.')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (selectedTier !== 'paid' || paidProjectMode !== 'project' || projects.length > 0) {
      return undefined
    }

    const controller = new AbortController()

    ;(async () => {
      try {
        setIsLoadingProjects(true)
        setError('')
        const rows = await listAllProjects({ signal: controller.signal })
        setProjects(Array.isArray(rows) ? rows : [])
      } catch (loadError) {
        if (loadError.name === 'AbortError') return
        setError(loadError.message || 'Could not load projects.')
      } finally {
        if (!controller.signal.aborted) setIsLoadingProjects(false)
      }
    })()

    return () => controller.abort()
  }, [paidProjectMode, projects.length, selectedTier])

  const startAssessment = (template) => {
    const selectedProject =
      selectedTier === 'paid' && paidProjectMode === 'project'
        ? projects.find((project) => String(project.id) === String(selectedProjectId))
        : null

    if (selectedTier === 'paid' && paidProjectMode === 'project' && !selectedProject) {
      setError('Select a project or continue without project.')
      return
    }

    const params = new URLSearchParams({
      templateId: String(template.id),
    })

    clearLocalDraft()
    navigate(`/internal-tools/legal-compliance?${params.toString()}`, {
      state: { startNew: true, selectedProject },
    })
  }

  const tierTemplates = selectedTier
    ? templates.filter(
        (template) => normalizeAssessmentTier(template.assessment_tier) === selectedTier,
      )
    : []

  const renderTierSelector = () => (
    <div className="legal-compliance-template-grid">
      {Object.values(ASSESSMENT_TIERS).map((tier) => (
        <div
          className="legal-compliance-template-tile border rounded p-3"
          key={tier.value}
          role="button"
          tabIndex={0}
          onClick={() => setSelectedTier(tier.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            setSelectedTier(tier.value)
          }}
          style={{ cursor: 'pointer' }}
        >
          <strong>{tier.label}</strong>
          <div className="text-body-secondary">
            {tier.value === 'free'
              ? 'Start a preliminary legal compliance assessment.'
              : 'Start a paid legal compliance assessment with optional project link.'}
          </div>
        </div>
      ))}
    </div>
  )

  const tierMeta = selectedTier ? getAssessmentTierMeta(selectedTier) : null
  const selectedProject = projects.find(
    (project) => String(project.id) === String(selectedProjectId),
  )

  return (
    <CRow className="g-4">
      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <strong>{tierMeta ? `${tierMeta.label} Templates` : 'Choose Assessment Type'}</strong>
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedTier) {
                  setSelectedTier(null)
                  setSelectedProjectId('')
                  setPaidProjectMode('none')
                  return
                }
                navigate('/internal-tools')
              }}
            >
              Back
            </CButton>
          </CCardHeader>
          <CCardBody>
            {notice && (
              <CAlert color="warning" dismissible onClose={() => setNotice('')}>
                {notice}
              </CAlert>
            )}
            {error && <CAlert color="danger">{error}</CAlert>}
            {isLoading ? (
              <DataTableLoadingState message="Loading templates..." />
            ) : !selectedTier ? (
              renderTierSelector()
            ) : selectedTier === 'paid' && paidProjectMode === 'project' && isLoadingProjects ? (
              <DataTableLoadingState message="Loading projects..." />
            ) : tierTemplates.length === 0 ? (
              <div className="text-body-secondary">
                No published {tierMeta.label.toLowerCase()} templates are available.
              </div>
            ) : (
              <>
                {selectedTier === 'paid' && (
                  <div className="mb-3">
                    <CFormLabel>Project Link</CFormLabel>
                    <div className="d-flex gap-2 flex-wrap">
                      <CButton
                        color={paidProjectMode === 'none' ? 'primary' : 'secondary'}
                        variant={paidProjectMode === 'none' ? undefined : 'outline'}
                        size="sm"
                        type="button"
                        onClick={() => {
                          setPaidProjectMode('none')
                          setSelectedProjectId('')
                          setError('')
                        }}
                      >
                        Continue Without Project
                      </CButton>
                      <CButton
                        color={paidProjectMode === 'project' ? 'primary' : 'secondary'}
                        variant={paidProjectMode === 'project' ? undefined : 'outline'}
                        size="sm"
                        type="button"
                        onClick={() => {
                          setPaidProjectMode('project')
                          setError('')
                        }}
                      >
                        Connect Existing Project
                      </CButton>
                    </div>
                    {paidProjectMode === 'project' && (
                      <div className="mt-2">
                        <CFormSelect
                          id="legalCompliancePaidProject"
                          value={selectedProjectId}
                          onChange={(event) => setSelectedProjectId(event.target.value)}
                        >
                          <option value="">Select project...</option>
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.project_name || `Project #${project.id}`}
                              {project.client_name ? ` - ${project.client_name}` : ''}
                            </option>
                          ))}
                        </CFormSelect>
                        {selectedProject && (
                          <div className="small text-body-secondary mt-1">
                            {selectedProject.client_name || selectedProject.project_name}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <LegalComplianceTemplateGrid
                  templates={tierTemplates}
                  onTemplateClick={startAssessment}
                />
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default LegalComplianceTemplateSelector
