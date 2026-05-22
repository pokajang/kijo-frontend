// src/views/project/ManageProject.js
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import ProjectTable from './ProjectTable'
import { fetchProjects, handleDeleteProject } from './actionHandlers'
import slugify from '../../../lib/slugify'

import CloseProjectModal from './CloseProjectModal'
import dialog from '../../../components/dialog/dialogService'

export default function ManageProject() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState(null)

  const [selected, setSelected] = useState(null)
  const [selectedCloseType, setSelectedCloseType] = useState('Completed')
  const [modals, setModals] = useState({
    close: false,
  })

  const loadProjects = () => {
    setLoading(true)
    fetchProjects()
      .then(setProjects)
      .catch((err) => {
        console.error('Failed to fetch projects:', err)
        setProjects([])
        dialog.alert(err.message || 'Failed to fetch projects.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const open = (name, project, options = {}) => {
    setSelected(project)
    if (name === 'close') {
      setSelectedCloseType(options.closeType || 'Completed')
    }
    setModals((m) => ({ ...m, [name]: true }))
  }
  const close = (name) => setModals((m) => ({ ...m, [name]: false }))

  const handleDelete = async (proj) => {
    if (deletingProjectId != null) return

    setDeletingProjectId(proj?.id || 'pending')
    try {
      const ok = await handleDeleteProject(proj)
      if (ok) loadProjects()
    } finally {
      setDeletingProjectId(null)
    }
  }

  const openCommercialCreatePage = (type, project) => {
    navigate(`/commercial/${type}/create/${project.id}`, { state: { project } })
  }

  return (
    <>
      <ProjectTable
        projects={projects}
        loading={loading}
        onManage={(p) => {
          const typeSlug = slugify(p.project_type) || 'project'
          const nameSlug = slugify(p.project_name) || 'details'
          navigate(`/project/manage/${p.id}/${typeSlug}/${nameSlug}`, { state: { project: p } })
        }}
        onClose={(p, closeType) => open('close', p, { closeType })}
        onGenerateInvoice={(p) => openCommercialCreatePage('invoice', p)}
        onGenerateDO={(p) => openCommercialCreatePage('delivery-order', p)}
        onGenerateJD14={(p) => openCommercialCreatePage('jd14', p)}
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
