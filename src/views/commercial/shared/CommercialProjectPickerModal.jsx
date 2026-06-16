import React, { useEffect, useMemo, useState } from 'react'
import { cilMoney } from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import {
  CAlert,
  CBadge,
  CButton,
  CFormInput,
  CFormLabel,
  CListGroup,
  CListGroupItem,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'

import { DataTableLoadingState } from '../../../components/datatable'
import { listActiveProjectOptions } from '../../project/manage/projectApi'

const emptyValue = '-'

const getProjectId = (project = {}) => project.id ?? project.project_id
const getProjectName = (project = {}) =>
  project.project_name || project.projectName || project.name || ''
const getClientName = (project = {}) => project.client_name || project.clientName || ''
const getProjectType = (project = {}) => project.project_type || project.projectType || ''
const getProjectValue = (project = {}) =>
  project.resolved_project_value ??
  project.resolvedProjectValue ??
  project.current_project_value ??
  project.currentProjectValue ??
  project.project_value ??
  project.projectValue ??
  project.quote_value ??
  project.quoteValue ??
  project.contract_value ??
  project.contractValue ??
  project.value ??
  project.valueDisplay ??
  null

const normalizeProjectType = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const projectMatchesAllowedTypes = (project, allowedProjectTypes) => {
  if (!allowedProjectTypes.length) return true
  const normalizedType = normalizeProjectType(getProjectType(project))
  return allowedProjectTypes.some((type) => normalizeProjectType(type) === normalizedType)
}

const formatProjectValue = (project = {}) => {
  const value = getProjectValue(project)
  if (value == null || String(value).trim() === '') return emptyValue
  const normalized = String(value)
    .replace(/^RM\s*/i, '')
    .replace(/,/g, '')
  const amount = Number(normalized)
  if (!Number.isFinite(amount)) return String(value)
  return `RM ${amount.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const getProjectSearchText = (project = {}) =>
  [
    getProjectId(project),
    getProjectName(project),
    getClientName(project),
    getProjectType(project),
    getProjectValue(project),
    formatProjectValue(project),
    project.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

const normalizeProjectForState = (project = {}) => ({
  ...project,
  id: getProjectId(project),
  project_id: project.project_id ?? getProjectId(project),
  project_name: getProjectName(project),
  project_type: getProjectType(project),
  client_name: getClientName(project),
  quote_value: getProjectValue(project),
  quoteValue: getProjectValue(project),
})

const ProjectMetaBadge = ({ children, selected }) => (
  <CBadge color={selected ? 'light' : 'secondary'} textColor={selected ? 'primary' : undefined}>
    {children}
  </CBadge>
)

const selectedProjectStyle = {
  backgroundColor: 'rgba(var(--cui-primary-rgb), 0.12)',
  borderColor: 'rgba(var(--cui-primary-rgb), 0.28)',
  color: 'var(--cui-primary)',
}

const CommercialProjectPickerModal = ({
  visible,
  onClose,
  onContinue,
  title,
  searchInputId,
  selectLabel = 'Select Project',
  creationLabel,
  projectScopeLabel = 'active projects',
  allowedProjectTypes = [],
}) => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const allowedProjectTypesKey = useMemo(
    () => allowedProjectTypes.map(normalizeProjectType).sort().join('|'),
    [allowedProjectTypes],
  )
  const normalizedAllowedProjectTypes = useMemo(
    () => allowedProjectTypesKey.split('|').filter(Boolean),
    [allowedProjectTypesKey],
  )

  useEffect(() => {
    if (!visible) return undefined

    const controller = new AbortController()
    setLoading(true)
    setError('')
    setSearchTerm('')
    setSelectedProjectId('')

    listActiveProjectOptions({ signal: controller.signal })
      .then((rows) => {
        if (controller.signal.aborted) return
        const eligibleProjects = Array.isArray(rows)
          ? rows.filter(
              (project) =>
                getProjectId(project) &&
                projectMatchesAllowedTypes(project, normalizedAllowedProjectTypes),
            )
          : []
        setProjects(eligibleProjects)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        console.error(`Failed to load ${projectScopeLabel} options:`, err)
        setProjects([])
        setError(err.message || `Unable to load ${projectScopeLabel}.`)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [normalizedAllowedProjectTypes, projectScopeLabel, visible])

  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const sorted = [...projects].sort((a, b) => getProjectName(a).localeCompare(getProjectName(b)))
    if (!term) return sorted
    return sorted.filter((project) => getProjectSearchText(project).includes(term))
  }, [projects, searchTerm])

  const selectedProject = useMemo(
    () => projects.find((project) => String(getProjectId(project)) === String(selectedProjectId)),
    [projects, selectedProjectId],
  )

  const handleContinue = () => {
    if (!selectedProject) return
    onContinue(normalizeProjectForState(selectedProject))
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="lg">
      <CModalHeader closeButton>
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CFormLabel htmlFor={searchInputId}>{selectLabel}</CFormLabel>
        <CFormInput
          id={searchInputId}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search project, client, type, value, or ID"
          disabled={loading}
        />

        {error ? (
          <CAlert color="danger" className="mt-3 mb-0">
            {error}
          </CAlert>
        ) : null}

        <div className="mt-3">
          {loading ? (
            <DataTableLoadingState message={`Loading ${projectScopeLabel}...`} />
          ) : filteredProjects.length === 0 ? (
            <div className="text-body-secondary border rounded p-3">
              {projects.length === 0
                ? `No ${projectScopeLabel} are available for ${creationLabel} creation.`
                : 'No projects match your search.'}
            </div>
          ) : (
            <CListGroup>
              {filteredProjects.map((project) => {
                const projectId = getProjectId(project)
                const selected = String(projectId) === String(selectedProjectId)
                const projectName = getProjectName(project) || `Project #${projectId}`
                const clientName = getClientName(project)
                const projectType = getProjectType(project) || emptyValue
                const projectValue = formatProjectValue(project)
                const projectTitle = clientName ? `${projectName} for ${clientName}` : projectName

                return (
                  <CListGroupItem
                    key={projectId}
                    as="button"
                    type="button"
                    onClick={() => setSelectedProjectId(String(projectId))}
                    aria-pressed={selected}
                    className="text-start list-group-item-action"
                    style={selected ? selectedProjectStyle : undefined}
                  >
                    <div className="d-flex align-items-start justify-content-between gap-3">
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="fw-semibold text-wrap">{projectTitle}</div>
                        <div className="d-flex flex-wrap gap-1 mt-2">
                          <ProjectMetaBadge selected={selected}>{projectType}</ProjectMetaBadge>
                        </div>
                      </div>
                      <div
                        className="d-flex align-items-center gap-2 text-success fw-semibold text-nowrap"
                        style={{ fontSize: '1.4rem', lineHeight: 1.1 }}
                      >
                        <CIcon icon={cilMoney} style={{ width: '1.4rem', height: '1.4rem' }} />
                        <span>{projectValue}</span>
                      </div>
                    </div>
                  </CListGroupItem>
                )
              })}
            </CListGroup>
          )}
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" size="sm" onClick={handleContinue} disabled={!selectedProject}>
          Continue
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default CommercialProjectPickerModal
