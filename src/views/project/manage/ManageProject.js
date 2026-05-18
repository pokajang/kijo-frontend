// src/views/project/ManageProject.js
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import ProjectTable from './ProjectTable'
import { fetchProjects, handleDeleteProject } from './actionHandlers'
import slugify from '../../../lib/slugify'

import CloseProjectModal from './CloseProjectModal'
import InvoiceProjectModal from './InvoiceProjectModal'
import DeliveryOrderModal from './DeliveryOrderModal'
import Jd14Modal from './Jd14Modal'
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
    invoice: false,
    do: false,
    jd14: false,
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
        onGenerateInvoice={(p) => open('invoice', p)}
        onGenerateDO={(p) => open('do', p)}
        onGenerateJD14={(p) => open('jd14', p)}
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
      {modals.invoice && selected && (
        <InvoiceProjectModal
          visible
          project={selected}
          onClose={() => close('invoice')}
          onSubmit={() => {
            close('invoice')
            loadProjects()
          }}
        />
      )}
      {modals.do && selected && (
        <DeliveryOrderModal visible project={selected} onClose={() => close('do')} />
      )}
      {modals.jd14 && selected && (
        <Jd14Modal visible project={selected} onClose={() => close('jd14')} />
      )}
    </>
  )
}
