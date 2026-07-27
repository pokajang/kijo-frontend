import React from 'react'
import { CCardBody, CCardHeader } from '@coreui/react'
import RemarksCell from '../tables/shared/RemarksCell'

const RecordActivityDetails = ({ record, getDateOnly }) => (
  <>
    <CCardHeader className="records-detail-section-header">
      <h2 className="h6 mb-0">Status &amp; Follow-up History</h2>
    </CCardHeader>
    <CCardBody>
      <RemarksCell record={record} fmtDate={getDateOnly} />
    </CCardBody>
  </>
)

export default RecordActivityDetails
