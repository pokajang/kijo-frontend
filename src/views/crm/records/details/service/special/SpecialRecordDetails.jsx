import React from 'react'
import { CCol } from '@coreui/react'
import RecordClientContactSection from '../../RecordClientContactSection'
import RecordDetailSection, { RecordDetailField } from '../../RecordDetailSection'
import RecordQuotationContextSection from '../../RecordQuotationContextSection'
import QuotationCalculationTable from '../../QuotationCalculationTable'
import { buildSpecialCalculationRows } from './specialRecordDetailUtils'

const SpecialRecordDetails = ({ record }) => {
  const formData = record?.formData || {}

  return (
    <>
      <RecordClientContactSection record={record} />
      <RecordQuotationContextSection record={record} />

      <RecordDetailSection title="Special Service Details">
        <RecordDetailField
          label="Special Service Type"
          value={
            formData.serviceTitle
              ? `${formData.serviceTitle}${formData.serviceCode ? ` (${formData.serviceCode})` : ''}`
              : ''
          }
          md={12}
          lg={12}
        />
        <RecordDetailField
          label="Quotation Remarks"
          value={formData.generalRemarks}
          md={12}
          lg={12}
        />
      </RecordDetailSection>

      <RecordDetailSection
        title="Quotation Calculation"
        bodyClassName="records-detail-calculation-body"
      >
        <CCol xs={12}>
          <QuotationCalculationTable
            rows={buildSpecialCalculationRows(record)}
            caption="Special service quotation calculation from line items to grand total"
          />
        </CCol>
      </RecordDetailSection>
    </>
  )
}

export default SpecialRecordDetails
