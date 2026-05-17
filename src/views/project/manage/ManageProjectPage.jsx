import React, { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CAlert, CButton, CCard, CCardBody, CCardHeader } from '@coreui/react'

import { DataTableLoadingState } from '../../../components/datatable'
import { getProjectFinanceData, listProjects, normalizeProjectList } from './projectApi'
import slugify from '../../../lib/slugify'
import ClientDetailsCard from './ManageProjectModal/ClientDetailsCard'
import CRMDetailsCard from './ManageProjectModal/CRMDetailsCard'
import ProjectDetailsCard from './ManageProjectModal/ProjectDetailsCard'
import ProgressTrackerCard from './ManageProjectModal/ProgressTrackerCard'
import VendorDetailsCard from './ManageProjectModal/VendorDetailsCard'
import PaymentRequestsCard from './ManageProjectModal/PaymentRequestsCard'
import ProfitLossCard from './ManageProjectModal/profit-loss/ProfitLossCard'
import CollaboratorsCard from './ManageProjectModal/CollaboratorsCard'

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

  const triggerProgressRefresh = () => {
    setProgressRefreshKey((prev) => prev + 1)
  }

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

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    if (project || !id) return () => {}

    setLoading(true)
    setLoadError('')

    listProjects({ signal: controller.signal })
      .then((data) => {
        if (!active) return
        const list = normalizeProjectList(data)
        const found = list.find((item) => String(item?.id) === String(id))

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
    <CCard className="mb-4">
      <CCardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2 text-truncate" style={{ minWidth: 0 }}>
          <strong>Manage Project</strong>
          <span className="text-medium-emphasis text-truncate">{project?.project_name || '-'}</span>
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

              <CollaboratorsCard projectId={project.id} onProgressUpdate={triggerProgressRefresh} />
            </>
          )}
        </ManageProjectErrorBoundary>
      </CCardBody>
    </CCard>
  )
}

export default ManageProjectPage
