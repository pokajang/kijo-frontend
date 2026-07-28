import React from 'react'
import { CBadge, CCol } from '@coreui/react'
import RecordClientContactSection from '../../RecordClientContactSection'
import RecordDetailSection, { RecordDetailField } from '../../RecordDetailSection'
import RecordPricingGovernanceSection from '../../RecordPricingGovernanceSection'
import RecordQuotationContextSection from '../../RecordQuotationContextSection'
import QuotationCalculationTable from '../../QuotationCalculationTable'
import { formatMoney, formatPercentage } from '../../quotationDetailUtils'
import { buildManpowerCalculationRows, getManpowerRateLabel } from './manpowerRecordDetailUtils'

const ManpowerRecordDetails = ({ record }) => {
  const formData = record?.formData || {}
  const isHourly = formData.billingUnit === 'hour'
  const duration = isHourly ? formData.durationHours : formData.durationMonths

  return (
    <>
      <RecordClientContactSection record={record} />
      <RecordQuotationContextSection record={record} />

      <RecordDetailSection title="Manpower Details">
        <RecordDetailField
          label="Manpower Service Type"
          value={
            formData.serviceTitle
              ? `${formData.serviceTitle}${formData.serviceCode ? ` (${formData.serviceCode})` : ''}`
              : ''
          }
          md={12}
          lg={12}
        />
        <RecordDetailField label="Nature of Work" value={formData.natureOfWork} md={6} lg={6} />
        <RecordDetailField label="Site Location" value={formData.siteLocation} md={6} lg={6} />
        <RecordDetailField
          label="Duration"
          value={`${duration ?? 0} ${isHourly ? 'hour(s)' : 'month(s)'}`}
        />
        <RecordDetailField label="Personnel" value={`${formData.noOfPax ?? 0} pax`} />
        <RecordDetailField
          label="Management Approval"
          value={
            formData.requiresManagementApproval ? (
              <CBadge color="warning">Required</CBadge>
            ) : (
              <CBadge color="secondary">Not required</CBadge>
            )
          }
        />
        <RecordDetailField
          label="Inquiry Remarks"
          value={formData.inquiryRemarks}
          md={12}
          lg={12}
        />
      </RecordDetailSection>

      <RecordPricingGovernanceSection serviceKey="manpower" record={record} />

      <RecordDetailSection title="Pricing Configuration">
        <RecordDetailField
          label="Rate Type"
          value={getManpowerRateLabel(formData.manpowerRateType)}
        />
        <RecordDetailField
          label="Billing Unit"
          value={isHourly ? 'Per pax per hour' : 'Per pax per month'}
        />
        <RecordDetailField label="Unit Cost" value={formatMoney(formData.unitCost)} />
        <RecordDetailField
          label="Discount"
          value={
            Number(record?.discountAmount || 0) > 0
              ? formatMoney(record.discountAmount)
              : 'No discount'
          }
        />
        <RecordDetailField label="SST Rate" value={formatPercentage(formData.sstPercent)} />
      </RecordDetailSection>

      <RecordDetailSection
        title="Quotation Calculation"
        bodyClassName="records-detail-calculation-body"
      >
        <CCol xs={12}>
          <QuotationCalculationTable
            rows={buildManpowerCalculationRows(record)}
            caption="Manpower quotation calculation from manpower cost to grand total"
          />
        </CCol>
      </RecordDetailSection>
    </>
  )
}

export default ManpowerRecordDetails
