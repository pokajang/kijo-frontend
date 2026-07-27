import React from 'react'
import { CCol } from '@coreui/react'
import RecordClientContactSection from '../../RecordClientContactSection'
import RecordDetailSection, { RecordDetailField } from '../../RecordDetailSection'
import RecordPricingGovernanceSection from '../../RecordPricingGovernanceSection'
import RecordQuotationContextSection from '../../RecordQuotationContextSection'
import QuotationCalculationTable from '../../QuotationCalculationTable'
import { formatMoney, formatPercentage } from '../../quotationDetailUtils'
import { buildHygieneCalculationRows, getHygienePricingRuleLabel } from './hygieneRecordDetailUtils'

const HygieneRecordDetails = ({ record }) => {
  const formData = record?.formData || {}
  const isLegacyPricing = formData.pricingRuleVersion === 'ih_complexity_v1'

  return (
    <>
      <RecordClientContactSection record={record} />
      <RecordQuotationContextSection record={record} />

      <RecordDetailSection title="Industrial Hygiene Details">
        <RecordDetailField
          label="IH Service Type"
          value={
            formData.serviceTitle
              ? `${formData.serviceTitle}${formData.serviceCode ? ` (${formData.serviceCode})` : ''}`
              : ''
          }
          md={12}
          lg={12}
        />
        <RecordDetailField label="Site Address" value={formData.siteAddress} md={12} lg={12} />
        <RecordDetailField
          label="Sample Count"
          value={`${formData.sampleCounts ?? 0} ${formData.sampleUnit || 'sample(s)'}`}
        />
        <RecordDetailField
          label="Work Units"
          value={
            Number(formData.numWorkUnits) > 0 ? formData.numWorkUnits : 'Not applicable (assumed 1)'
          }
        />
        <RecordDetailField
          label="Quotation Remarks"
          value={formData.inquiryRemarks}
          md={12}
          lg={12}
        />
      </RecordDetailSection>

      <RecordPricingGovernanceSection serviceKey="ih" record={record} />

      <RecordDetailSection title="Pricing Configuration">
        <RecordDetailField
          label="Pricing Rule"
          value={getHygienePricingRuleLabel(formData.pricingRuleVersion)}
        />
        {isLegacyPricing ? (
          <RecordDetailField
            label="Legacy Complexity"
            value={`Rating ${formData.complexityRating || 1}`}
          />
        ) : null}
        <RecordDetailField label="Unit Price" value={formatMoney(formData.unitPrice)} />
        <RecordDetailField
          label="Mobilization & Accommodation"
          value={formatMoney(formData.travelCharge)}
        />
        <RecordDetailField
          label="Additional Fees"
          value={`${record?.lineItems?.length || 0} item(s)`}
        />
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

      <RecordDetailSection title="Quotation Calculation" bodyClassName="pt-0">
        <CCol xs={12}>
          <QuotationCalculationTable
            rows={buildHygieneCalculationRows(record)}
            caption="Industrial hygiene quotation calculation from service cost to grand total"
          />
        </CCol>
      </RecordDetailSection>
    </>
  )
}

export default HygieneRecordDetails
