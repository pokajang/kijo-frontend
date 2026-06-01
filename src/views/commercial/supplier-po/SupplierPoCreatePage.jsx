import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'

import SupplierPo from '../../catalog/supplier-po/SupplierPo'

const getProjectId = (project = {}) => project.id ?? project.project_id

const SupplierPoCreatePage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { projectId } = useParams()
  const [searchParams] = useSearchParams()
  const [createdPo, setCreatedPo] = useState(null)

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
  const successLead = createdPo?.poId ? `Supplier PO #${createdPo.poId}` : 'The Supplier PO'

  if (createdPo) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Supplier PO Created</strong>
            </CCardHeader>
            <CCardBody>
              <p className="mb-3">{successLead} has been created.</p>
              <div className="d-flex justify-content-end flex-wrap gap-2">
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/commercial/supplier-po')}
                >
                  Return to Supplier PO List
                </CButton>
                <CButton
                  color="primary"
                  size="sm"
                  onClick={() => navigate(`/project/manage/${resolvedProjectId}`)}
                >
                  Manage Project
                </CButton>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    )
  }

  return (
    <SupplierPo
      module="commercial"
      initialProjectId={resolvedProjectId}
      initialProject={project}
      lockProject
      onCreated={(result) => {
        setCreatedPo({ ...result, origin })
      }}
    />
  )
}

export default SupplierPoCreatePage
