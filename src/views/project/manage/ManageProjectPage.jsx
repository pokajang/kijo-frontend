import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CAlert, CButton, CCard, CCardBody, CCardHeader } from '@coreui/react'

import { DataTableActionButtonGroup, DataTableLoadingState } from '../../../components/datatable'
import { handleDeleteProject } from './actionHandlers'
import { getProjectDetails, getProjectFinanceData } from './projectApi'
import CloseProjectModal from './CloseProjectModal'
import ClientDetailsCard from './ManageProjectModal/ClientDetailsCard'
import CommercialTrailsCard from './ManageProjectModal/CommercialTrailsCard'
import CRMDetailsCard from './ManageProjectModal/CRMDetailsCard'
import ProjectDetailsCard from './ManageProjectModal/ProjectDetailsCard'
import ProjectSummaryStrip from './ManageProjectModal/ProjectSummaryStrip'
import ProgressTrackerCard from './ManageProjectModal/ProgressTrackerCard'
import VendorDetailsCard from './ManageProjectModal/VendorDetailsCard'
import PaymentRequestsCard from './ManageProjectModal/PaymentRequestsCard'
import ProfitLossCard from './ManageProjectModal/profit-loss/ProfitLossCard'
import CollaboratorsCard from './ManageProjectModal/CollaboratorsCard'
import { PROJECT_CLOSE_TYPES } from './projectStatus'
import { buildProjectActions } from './projectActions'
import {
  getCommercialCreatePath,
  getProjectManagePath,
  isProjectManagePathCanonical,
} from './projectRoutes'

const projectActionGroups = [
  ['jd14', 'invoice', 'delivery-order', 'vendor-loa', 'supplier-po'],
  ['complete', 'terminate'],
  ['delete'],
]
const groupedProjectActionKeys = new Set(projectActionGroups.flat())

class ManageProjectErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <CAlert color="danger" className="mb-0">
          Something went wrong while rendering this page.
        </CAlert>
      )
    }
    return this.props.children
  }
}

ManageProjectErrorBoundary.propTypes = {
  children: PropTypes.node,
}

const ManageProjectPage = () => {
  const navigate = useNavigate()
  const { id, type, name } = useParams()
  const location = useLocation()

  const [project, setProject] = useState(location.state?.project || null)
  const [loading, setLoading] = useState(!location.state?.project)
  const [loadError, setLoadError] = useState('')

  const [projectPayments, setProjectPayments] = useState([])
  const [projectExpenses, setProjectExpenses] = useState([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [financeError, setFinanceError] = useState('')

  const [progressRefreshKey, setProgressRefreshKey] = useState(0)
  const [commercialRefreshKey, setCommercialRefreshKey] = useState(0)
  const [vendorRefreshKey, setVendorRefreshKey] = useState(0)
  const [deletingProjectId, setDeletingProjectId] = useState(null)
  const [selectedCloseType, setSelectedCloseType] = useState(PROJECT_CLOSE_TYPES.COMPLETED)
  const [modals, setModals] = useState({
    close: false,
  })

  const triggerProgressRefresh = useCallback(() => {
    setProgressRefreshKey((prev) => prev + 1)
  }, [])

  const triggerCommercialRefresh = useCallback(() => {
    setCommercialRefreshKey((prev) => prev + 1)
  }, [])

  const triggerVendorRefresh = useCallback(() => {
    setVendorRefreshKey((prev) => prev + 1)
  }, [])

  const handleProjectDetailsSaved = useCallback((updated) => {
    setProject((prev) => ({
      ...prev,
      ...updated,
    }))
  }, [])

  const refreshProject = useCallback(async () => {
    if (!project?.id) return
    const freshProject = await getProjectDetails(project.id)
    if (freshProject) setProject(freshProject)
  }, [project?.id])

  const fetchProjectFinanceData = useCallback(
    async (options = {}) => {
      if (!project?.id) return

      try {
        setLoadingPayments(true)
        setFinanceError('')
        const data = await getProjectFinanceData(project.id, options)
        setProjectPayments(data.history)
        setProjectExpenses(data.expenses)
      } catch (err) {
        if (err.name === 'AbortError') return
        if (!options.silentError) {
          console.error('Failed to fetch finance data:', err)
          setProjectPayments([])
          setProjectExpenses([])
        }
        setFinanceError(err.message || 'Failed to load project finance data.')
      } finally {
        setLoadingPayments(false)
      }
    },
    [project?.id],
  )

  const handleProjectValueUpdated = useCallback(
    (updated) => {
      handleProjectDetailsSaved(updated)
      triggerCommercialRefresh()
      triggerProgressRefresh()
      fetchProjectFinanceData({ silentError: true })
    },
    [
      fetchProjectFinanceData,
      handleProjectDetailsSaved,
      triggerCommercialRefresh,
      triggerProgressRefresh,
    ],
  )

  const openActionModal = useCallback((name, options = {}) => {
    if (name === 'close') {
      setSelectedCloseType(options.closeType || PROJECT_CLOSE_TYPES.COMPLETED)
    }
    setModals((current) => ({ ...current, [name]: true }))
  }, [])

  const closeActionModal = useCallback((name) => {
    setModals((current) => ({ ...current, [name]: false }))
  }, [])

  const openCommercialCreatePage = useCallback(
    (documentType) => {
      if (!project?.id) return
      navigate(getCommercialCreatePath(documentType, project.id), { state: { project } })
    },
    [navigate, project],
  )

  const handleDelete = useCallback(async () => {
    if (!project || deletingProjectId != null) return

    setDeletingProjectId(project.id || 'pending')
    try {
      const ok = await handleDeleteProject(project)
      if (ok) navigate('/project/manage')
    } finally {
      setDeletingProjectId(null)
    }
  }, [deletingProjectId, navigate, project])

  const projectActions = useMemo(() => {
    return buildProjectActions({
      project,
      deleting: deletingProjectId != null,
      onGenerateCommercialDocument: openCommercialCreatePage,
      onCompleteProject: () =>
        openActionModal('close', { closeType: PROJECT_CLOSE_TYPES.COMPLETED }),
      onTerminateProject: () =>
        openActionModal('close', { closeType: PROJECT_CLOSE_TYPES.TERMINATED }),
      onDeleteProject: handleDelete,
    })
  }, [deletingProjectId, handleDelete, openActionModal, openCommercialCreatePage, project])

  const groupedProjectActions = useMemo(() => {
    const configuredGroups = projectActionGroups
      .map((groupKeys) => projectActions.filter((action) => groupKeys.includes(action.key)))
      .filter((actions) => actions.length > 0)

    const ungroupedActions = projectActions.filter(
      (action) => !groupedProjectActionKeys.has(action.key),
    )

    return ungroupedActions.length > 0 ? [...configuredGroups, ungroupedActions] : configuredGroups
  }, [projectActions])

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    if (!id) return () => {}
    const hasMatchingRouteStateProject =
      location.state?.project && String(location.state.project.id) === String(id)

    if (!hasMatchingRouteStateProject) {
      setLoading(true)
      setLoadError('')
      setProject(null)
    }

    getProjectDetails(id, { signal: controller.signal })
      .then((found) => {
        if (!active) return
        if (!found) {
          if (!hasMatchingRouteStateProject) {
            setProject(null)
            setLoadError('Project not found.')
          }
          return
        }

        setProject(found)
        setLoadError('')
      })
      .catch((err) => {
        if (!active) return
        if (err.name === 'AbortError') return
        console.error('Failed to load project:', err)
        if (!hasMatchingRouteStateProject) {
          setLoadError(err.message || 'Failed to load project.')
        }
      })
      .finally(() => {
        if (!active) return
        if (!hasMatchingRouteStateProject) {
          setLoading(false)
        }
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [id, location.state])

  useEffect(() => {
    if (!project?.id) return

    if (isProjectManagePathCanonical(project, { id, type, name })) return

    navigate(getProjectManagePath(project), {
      replace: true,
      state: { ...location.state, project },
    })
  }, [
    id,
    project?.id,
    project?.project_type,
    project?.project_name,
    type,
    name,
    navigate,
    project,
    location.state,
  ])

  useEffect(() => {
    if (!project?.id) {
      setProjectPayments([])
      setProjectExpenses([])
      return
    }

    const controller = new AbortController()

    fetchProjectFinanceData({ signal: controller.signal })

    return () => {
      controller.abort()
    }
  }, [project?.id, fetchProjectFinanceData])

  return (
    <>
      <CCard className="mb-4">
        <CCardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 text-truncate" style={{ minWidth: 0 }}>
            <strong>Manage Project</strong>
            <span className="text-medium-emphasis text-truncate">
              {project?.project_name || '-'}
            </span>
          </div>
          <CButton
            color="secondary"
            size="sm"
            variant="outline"
            onClick={() => navigate('/project/manage')}
          >
            Back
          </CButton>
        </CCardHeader>

        <CCardBody className="p-0">
          <ManageProjectErrorBoundary>
            {loading ? (
              <DataTableLoadingState message="Loading project..." />
            ) : loadError || !project ? (
              <CAlert color="danger" className="mb-0">
                {loadError || 'Project not found.'}
              </CAlert>
            ) : (
              <>
                <ProjectSummaryStrip project={project} />

                <ClientDetailsCard project={project} />

                <CRMDetailsCard project={project} />

                <CommercialTrailsCard
                  projectId={project.id}
                  refreshKey={commercialRefreshKey}
                  onCommercialRecordsChanged={triggerCommercialRefresh}
                  onProgressUpdate={triggerProgressRefresh}
                  onVendorAssignmentsChanged={triggerVendorRefresh}
                />

                <ProjectDetailsCard
                  project={project}
                  onSave={handleProjectDetailsSaved}
                  onValueUpdated={handleProjectValueUpdated}
                />

                <ProgressTrackerCard
                  projectId={project.id}
                  projectName={project.project_name || ''}
                  refreshKey={progressRefreshKey}
                />

                <VendorDetailsCard
                  project={project}
                  refreshKey={vendorRefreshKey}
                  onProgressUpdate={triggerProgressRefresh}
                />

                <PaymentRequestsCard payments={projectPayments} loading={loadingPayments} />

                {financeError && (
                  <CAlert color="warning" className="mx-3 mb-3">
                    {financeError}
                  </CAlert>
                )}

                <ProfitLossCard
                  project={project}
                  vendorPayments={projectPayments}
                  projectExpenses={projectExpenses}
                  onDataRefresh={fetchProjectFinanceData}
                />

                <CollaboratorsCard
                  projectId={project.id}
                  onProgressUpdate={triggerProgressRefresh}
                />

                <CCardHeader>
                  <strong>Actions</strong>
                </CCardHeader>
                <CCardBody>
                  <div className="d-flex flex-wrap align-items-start gap-3">
                    {groupedProjectActions.map((actions) => (
                      <DataTableActionButtonGroup
                        key={actions.map((action) => action.key).join('-')}
                        record={project}
                        actions={actions}
                      />
                    ))}
                  </div>
                </CCardBody>
              </>
            )}
          </ManageProjectErrorBoundary>
        </CCardBody>
      </CCard>

      {modals.close && project && (
        <CloseProjectModal
          visible
          project={project}
          initialCloseType={selectedCloseType}
          onClose={() => closeActionModal('close')}
          onConfirm={() => {
            closeActionModal('close')
            setProject((current) =>
              current
                ? {
                    ...current,
                    status: selectedCloseType,
                  }
                : current,
            )
            refreshProject().catch((err) => {
              console.error('Failed to refresh project after close:', err)
            })
          }}
        />
      )}
    </>
  )
}
export default ManageProjectPage
