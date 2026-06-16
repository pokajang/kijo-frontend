import React from 'react'
import PropTypes from 'prop-types'
import { CCardBody, CCol, CFormLabel, CRow } from '@coreui/react'

import { DataTableStatusBadge } from '../../../../components/datatable'
import {
  getAwardedProjectValue,
  getCurrentProjectValue,
  getProjectVariationValue,
} from '../projectApi'
import { getProjectStatusTone } from '../projectStatus'
import {
  formatProjectDate,
  formatProjectMoney,
  getProjectLatestUpdate,
  getProjectLeader,
} from '../projectDetailFormatters'

const SummaryItem = ({ label, children }) => (
  <CCol xs={6} md={4} xl={2} className="project-detail-kv">
    <CFormLabel>{label}</CFormLabel>
    <p className="mb-0">{children || '-'}</p>
  </CCol>
)

SummaryItem.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node,
}

const ProjectSummaryStrip = ({ project = {} }) => {
  const variation = getProjectVariationValue(project)

  return (
    <CCardBody className="border-bottom">
      <CRow className="g-3">
        <SummaryItem label="Status">
          <DataTableStatusBadge tone={getProjectStatusTone(project)}>
            {project.status || '-'}
          </DataTableStatusBadge>
        </SummaryItem>
        <SummaryItem label="Project Type">{project.project_type || '-'}</SummaryItem>
        <SummaryItem label="Awarded Value">
          {formatProjectMoney(getAwardedProjectValue(project))}
        </SummaryItem>
        <SummaryItem label="Current Value">
          {formatProjectMoney(getCurrentProjectValue(project))}
        </SummaryItem>
        <SummaryItem label="Variation">{formatProjectMoney(variation)}</SummaryItem>
        <SummaryItem label="Leader">{getProjectLeader(project)}</SummaryItem>
        <SummaryItem label="Award Date">{formatProjectDate(project.award_date)}</SummaryItem>
        <SummaryItem label="Last Update">{getProjectLatestUpdate(project)}</SummaryItem>
      </CRow>
    </CCardBody>
  )
}

ProjectSummaryStrip.propTypes = {
  project: PropTypes.object,
}

export default ProjectSummaryStrip
