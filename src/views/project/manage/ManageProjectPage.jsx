import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CAlert, CButton, CCard, CCardBody, CCardHeader } from '@coreui/react'

import { DataTableActionButtonGroup, DataTableLoadingState } from '../../../components/datatable'
import { handleDeleteProject } from './actionHandlers'
import { getProjectDetails, getProjectFinanceData } from './projectApi'
import slugify from '../../../lib/slugify'
import CloseProjectModal from './CloseProjectModal'
import ClientDetailsCard from './ManageProjectModal/ClientDetailsCard'
import CommercialTrailsCard from './ManageProjectModal/CommercialTrailsCard'
import CRMDetailsCard from './ManageProjectModal/CRMDetailsCard'
import DeliveryOrderModal from './DeliveryOrderModal'
import InvoiceProjectModal from './InvoiceProjectModal'
import Jd14Modal from './Jd14Modal'
import ProjectDetailsCard from './ManageProjectModal/ProjectDetailsCard'
import ProgressTrackerCard from './ManageProjectModal/ProgressTrackerCard'
import VendorDetailsCard from './ManageProjectModal/VendorDetailsCard'
import PaymentRequestsCard from './ManageProjectModal/PaymentRequestsCard'
import ProfitLossCard from './ManageProjectModal/profit-loss/ProfitLossCard'
import CollaboratorsCard from './ManageProjectModal/CollaboratorsCard'

const getNormalizedProjectStatus = (project = {}) =>
  String(project?.status || '')
    .trim()
    .toLowerCase()

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
  const [deletingProjectId, setDeletingProjectId] = useState(null)
  const [selectedCloseType, setSelectedCloseType] = useState('Completed')
  const [modals, setModals] = useState({
    close: false,
    invoice: false,
    do: false,
    jd14: false,
  })

  const triggerProgressRefresh = () => {
    setProgressRefreshKey((prev) => prev + 1)
  }

  const triggerCommercialRefresh = () => {
    setCommercialRefreshKey((prev) => prev + 1)
  }

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
        console.error('Failed to fetch finance data:', err)
        setProjectPayments([])
        setProjectExpenses([])
        setFinanceError(err.message || 'Failed to load project finance data.')
      } finally {
        setLoadingPayments(false)
      }
    },
    [project?.id],
  )

  const openActionModal = useCallback((name, options = {}) => {
    if (name === 'close') {
      setSelectedCloseType(options.closeType || 'Completed')
    }
    setModals((current) => ({ ...current, [name]: true }))
  }, [])

  const closeActionModal = useCallback((name) => {
    setModals((current) => ({ ...current, [name]: false }))
  }, [])

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
    if (!project) return []

    const status = getNormalizedProjectStatus(project)
    const isClosedProject = status === 'completed' || status === 'terminated' || status === 'closed'

    return [
      project.project_type === 'Training'
        ? {
            key: 'jd14',
            label: 'Generate JD14',
            onClick: () => openActionModal('jd14'),
          }
        : null,
      {
        key: 'invoice',
        label: 'Generate Invoice',
        onClick: () => openActionModal('invoice'),
      },
      {
        key: 'delivery-order',
        label: 'Generate DO',
        onClick: () => openActionModal('do'),
      },
      {
        key: 'complete',
        label: 'Complete Project',
        disabled: isClosedProject,
        tooltip: isClosedProject ? 'Project is already closed.' : undefined,
        onClick: () => openActionModal('close', { closeType: 'Completed' }),
      },
      {
        key: 'terminate',
        label: 'Terminate Project',
        disabled: isClosedProject,
        tooltip: isClosedProject ? 'Project is already closed.' : undefined,
        danger: true,
        onClick: () => openActionModal('close', { closeType: 'Terminated' }),
      },
      {
        key: 'delete',
        label: 'Delete Project',
        buttonLabel: deletingProjectId != null ? 'Deleting...' : 'Delete Project',
        danger: true,
        disabled: deletingProjectId != null,
        onClick: handleDelete,
      },
    ].filter(Boolean)
  }, [deletingProjectId, handleDelete, openActionModal, project])

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    if (!id) return () => {}
    if (project && String(project.id) === String(id)) return () => {}

    setLoading(true)
    setLoadError('')
    setProject(null)

    getProjectDetails(id, { signal: controller.signal })
      .then((found) => {
        if (!active) return
        if (!found) {
          setProject(null)
          setLoadError('Project not found.')
          return
        }

        setProject(found)
      })
      .catch((err) => {
        if (!active) return
        if (err.name === 'AbortError') return
        console.error('Failed to load project:', err)
        setLoadError(err.message || 'Failed to load project.')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [id, project])

  useEffect(() => {
    if (!project?.id) return

    const typeSlug = slugify(project.project_type) || 'project'
    const nameSlug = slugify(project.project_name) || 'details'

    if (type === typeSlug && name === nameSlug) return

    if (!type && !name) {
      navigate(`/project/manage/${project.id}/${typeSlug}/${nameSlug}`, {
        replace: true,
        state: { project },
      })
    }
  }, [project?.id, project?.project_type, project?.project_name, type, name, navigate, project])

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
                <ClientDetailsCard project={project} />

                <CRMDetailsCard project={project} />

                <CommercialTrailsCard projectId={project.id} refreshKey={commercialRefreshKey} />

                <ProjectDetailsCard
                  project={project}
                  onSave={(updated) =>
                    setProject((prev) => ({
                      ...prev,
                      ...updated,
                    }))
                  }
                />

                <ProgressTrackerCard projectId={project.id} refreshKey={progressRefreshKey} />

                <VendorDetailsCard project={project} onProgressUpdate={triggerProgressRefresh} />

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
              </>
            )}
          </ManageProjectErrorBoundary>
        </CCardBody>

        {!loading && !loadError && project && (
          <>
            <CCardHeader>
              <strong>Actions</strong>
            </CCardHeader>
            <CCardBody>
              <DataTableActionButtonGroup record={project} actions={projectActions} />
            </CCardBody>
          </>
        )}
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
      {modals.invoice && project && (
        <InvoiceProjectModal
          visible
          project={project}
          onClose={() => closeActionModal('invoice')}
          onSubmit={() => {
            closeActionModal('invoice')
            triggerCommercialRefresh()
            fetchProjectFinanceData().catch((err) => {
              console.error('Failed to refresh project finance data:', err)
            })
          }}
        />
      )}
      {modals.do && project && (
        <DeliveryOrderModal
          visible
          project={project}
          onClose={() => closeActionModal('do')}
          onCreated={triggerCommercialRefresh}
        />
      )}
      {modals.jd14 && project && (
        <Jd14Modal
          visible
          project={project}
          onClose={() => closeActionModal('jd14')}
          onCreated={triggerCommercialRefresh}
        />
      )}
    </>
  )
}

export default ManageProjectPage
