import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CAlert, CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'

import { DataTableLoadingState } from '../../../components/datatable'
import { getProjectDetails } from '../../project/manage/projectApi'
import VendorLoaCreateFlow from './create/VendorLoaCreateFlow'

const VendorLoaCreatePage = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const origin = searchParams.get('from') === 'vendor-loa-list' ? 'vendor-loa-list' : 'project'
  const stateProject =
    origin !== 'vendor-loa-list' && String(location.state?.project?.id || '') === String(projectId)
      ? location.state.project
      : null

  const [project, setProject] = useState(stateProject)
  const [loading, setLoading] = useState(!stateProject)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!projectId) return undefined

    let active = true
    const controller = new AbortController()

    if (stateProject) {
      setProject(stateProject)
    }
    setLoading(!stateProject)
    setError('')
    getProjectDetails(projectId, { signal: controller.signal })
      .then((found) => {
        if (!active) return
        if (!found) {
          setProject(null)
          setError('Project not found.')
          return
        }
        setProject(found)
      })
      .catch((err) => {
        if (!active || err.name === 'AbortError') return
        console.error('Failed to load project for vendor LOA creation:', err)
        setError(err.message || 'Failed to load project.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [projectId, stateProject])

  const handleBack = () =>
    origin === 'vendor-loa-list'
      ? navigate('/commercial/vendor-loa')
      : navigate(`/project/manage/${projectId}`)

  if (loading) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardBody>
              <DataTableLoadingState message="Loading project..." />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    )
  }

  if (error || !project) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
              <strong>Create Vendor LOA</strong>
              <CButton color="secondary" size="sm" variant="outline" onClick={handleBack}>
                {origin === 'vendor-loa-list' ? 'Back to Vendor LOA List' : 'Back to Project'}
              </CButton>
            </CCardHeader>
            <CCardBody>
              <CAlert color="danger" className="mb-0">
                {error || 'Project not found.'}
              </CAlert>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    )
  }

  return (
    <CRow>
      <CCol xs={12}>
        <VendorLoaCreateFlow project={project} origin={origin} onBack={handleBack} />
      </CCol>
    </CRow>
  )
}

export default VendorLoaCreatePage
