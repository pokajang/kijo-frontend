// src/views/project/ManageProject.js
import React, { useCallback, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import ProjectTable from './ProjectTable'
import { fetchProjects, handleDeleteProject } from './actionHandlers'

import CloseProjectModal from './CloseProjectModal'
import dialog from '../../../components/dialog/dialogService'
import { getPeriodRangePreset } from '../../../components/filters'
import { PROJECT_CLOSE_TYPES } from './projectStatus'
import { getCommercialCreatePath, getProjectManagePath } from './projectRoutes'

export default function ManageProject() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState(null)
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const latestLoadRequestRef = useRef(0)
  const deletingProjectIdRef = useRef(null)

  const [selected, setSelected] = useState(null)
  const [selectedCloseType, setSelectedCloseType] = useState(PROJECT_CLOSE_TYPES.COMPLETED)
  const [modals, setModals] = useState({
    close: false,
  })

  const loadProjects = useCallback(
    ({ signal } = {}) => {
      const requestId = latestLoadRequestRef.current + 1
      latestLoadRequestRef.current = requestId
      const isLatestRequest = () => latestLoadRequestRef.current === requestId
      const isAborted = (err) => signal?.aborted || err?.name === 'AbortError'

      setLoading(true)
      return fetchProjects({ periodRange, signal })
        .then((records) => {
          if (!isLatestRequest() || signal?.aborted) return
          setProjects(records)
        })
        .catch((err) => {
          if (isAborted(err) || !isLatestRequest()) return

          console.error('Failed to fetch projects:', err)
          setProjects([])
          dialog.alert(err.message || 'Failed to fetch projects.')
        })
        .finally(() => {
          if (!isLatestRequest() || signal?.aborted) return
          setLoading(false)
        })
    },
    [periodRange],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadProjects({ signal: controller.signal })

    return () => {
      controller.abort()
    }
  }, [loadProjects])

  const open = (name, project, options = {}) => {
    setSelected(project)
    if (name === 'close') {
      setSelectedCloseType(options.closeType || PROJECT_CLOSE_TYPES.COMPLETED)
    }
    setModals((m) => ({ ...m, [name]: true }))
  }
  const close = (name) => setModals((m) => ({ ...m, [name]: false }))

  const handleDelete = async (proj) => {
    if (deletingProjectIdRef.current != null) return

    const nextDeletingProjectId = proj?.id || 'pending'
    deletingProjectIdRef.current = nextDeletingProjectId
    setDeletingProjectId(nextDeletingProjectId)
    try {
      const ok = await handleDeleteProject(proj)
      if (ok) loadProjects()
    } finally {
      deletingProjectIdRef.current = null
      setDeletingProjectId(null)
    }
  }

  const openCommercialCreatePage = (type, project) => {
    navigate(getCommercialCreatePath(type, project.id), { state: { project } })
  }

  return (
    <>
      <ProjectTable
        projects={projects}
        loading={loading}
        deletingProjectId={deletingProjectId}
        periodRange={periodRange}
        onPeriodRangeChange={setPeriodRange}
        onManage={(p) => {
          navigate(getProjectManagePath(p), { state: { project: p } })
        }}
        onClose={(p, closeType) => open('close', p, { closeType })}
        onGenerateInvoice={(p) => openCommercialCreatePage('invoice', p)}
        onGenerateDO={(p) => openCommercialCreatePage('delivery-order', p)}
        onGenerateJD14={(p) => openCommercialCreatePage('jd14', p)}
        onGenerateVendorLoa={(p) => openCommercialCreatePage('vendor-loa', p)}
        onGenerateSupplierPo={(p) => openCommercialCreatePage('supplier-po', p)}
        onDelete={handleDelete}
        onCreateProject={() => navigate('/project/create')}
      />

      {modals.close && selected && (
        <CloseProjectModal
          visible
          project={selected}
          initialCloseType={selectedCloseType}
          onClose={() => close('close')}
          onConfirm={() => {
            close('close')
            loadProjects()
          }}
        />
      )}
    </>
  )
}
