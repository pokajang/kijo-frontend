import React, { useMemo } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import SupplierPo from '../../catalog/supplier-po/SupplierPo'
import useCommercialCreationSuccess from '../shared/useCommercialCreationSuccess'

const getProjectId = (project = {}) => project.id ?? project.project_id

const SupplierPoCreatePage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { projectId } = useParams()
  const [searchParams] = useSearchParams()

  const origin = searchParams.get('from') || 'project'
  const project = useMemo(
    () =>
      location.state?.project || {
        id: projectId,
        project_id: projectId,
        project_name: projectId ? `Project #${projectId}` : '',
      },
    [location.state?.project, projectId],
  )
  const resolvedProjectId = getProjectId(project) || projectId
  const isListOrigin = origin === 'supplier-po-list'
  const presentCreationSuccess = useCommercialCreationSuccess({
    documentType: 'supplier-po',
    documentLabel: 'Supplier PO',
    projectId: resolvedProjectId,
    projectLabel: project.project_name || `Project #${resolvedProjectId}`,
    origin,
    listOrigin: 'supplier-po-list',
    listPath: '/commercial/supplier-po',
    detailPath: '/commercial/supplier-po',
    viewLabel: 'View Supplier PO',
    listLabel: 'View Supplier PO List',
  })
  const handleBack = () =>
    isListOrigin
      ? navigate('/commercial/supplier-po')
      : navigate(`/project/manage/${resolvedProjectId}`)

  return (
    <SupplierPo
      module="commercial"
      initialProjectId={resolvedProjectId}
      initialProject={project}
      lockProject
      contextLabel={`For project: ${project.project_name || `Project #${resolvedProjectId}`}`}
      backLabel={isListOrigin ? 'Back to Supplier PO List' : 'Back to Project'}
      onBack={handleBack}
      onCreated={async (result) => {
        await presentCreationSuccess({
          detailId: result?.poId,
          reference: result?.poId ? `#${result.poId}` : '',
        })
      }}
    />
  )
}

export default SupplierPoCreatePage
