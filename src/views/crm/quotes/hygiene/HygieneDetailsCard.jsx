import React from 'react'
import { CCol, CCard, CCardHeader, CCardBody, CForm, CAlert } from '@coreui/react'
import ServiceTypeCard from './ServiceTypeCard'
import ProjectDetailsCard from './ProjectDetailsCard'
import SiteLocationCard from './SiteLocationCard'
import RemarksAndTravelCard from './RemarksAndTravelCard'
import { useQuoteRouteParams } from '../helpers/quoteRouteParams'

const HygieneDetailsCardMain = ({
  formData,
  setFormData,
  selectedClient,
  isEditMode = false,
  proposalLanguage = 'en',
}) => {
  const { isRevision } = useQuoteRouteParams()

  return (
    <CCol xs={12}>
      <CCard className="mb-4">
        <CCardHeader>
          <strong>Industrial Hygiene Details</strong>
        </CCardHeader>
        <CCardBody>
          {isEditMode && (
            <CAlert color="primary">
              <strong>
                {isRevision
                  ? 'You are revising the existing quotation. The quotation number will be appended with Rev xx.'
                  : "You are editing the existing quotation. This won't change the quotation number."}
              </strong>
            </CAlert>
          )}
          <CForm>
            <ServiceTypeCard
              formData={formData}
              setFormData={setFormData}
              isEditMode={isEditMode}
              proposalLanguage={proposalLanguage}
            />
            <ProjectDetailsCard
              formData={formData}
              setFormData={setFormData}
              isEditMode={isEditMode}
            />
            <SiteLocationCard
              formData={formData}
              setFormData={setFormData}
              selectedClient={selectedClient}
              isEditMode={isEditMode}
            />
            <RemarksAndTravelCard
              formData={formData}
              setFormData={setFormData}
              isEditMode={isEditMode}
            />
          </CForm>
        </CCardBody>
      </CCard>
    </CCol>
  )
}

export default HygieneDetailsCardMain
