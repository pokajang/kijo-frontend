import React from 'react'
import { CCol } from '@coreui/react'
import RecordClientContactSection from '../../RecordClientContactSection'
import RecordDetailSection, { RecordDetailField } from '../../RecordDetailSection'
import RecordPricingGovernanceSection from '../../RecordPricingGovernanceSection'
import RecordQuotationContextSection from '../../RecordQuotationContextSection'
import TrainingCommercialBreakdown from './TrainingCommercialBreakdown'
import {
  formatDateRange,
  formatMoney,
  formatPercentage,
  getPricingBasisLabel,
  getTrainingRateLabel,
  getTravelRegionLabel,
  toBoolean,
  toFiniteNumber,
} from './trainingRecordDetailUtils'

const TrainingRecordDetails = ({ record, getDateOnly }) => {
  const formData = record?.formData || {}
  const mealsProvided = toBoolean(formData.mealsProvided)

  return (
    <>
      <RecordClientContactSection record={record} />
      <RecordQuotationContextSection record={record} />

      <RecordDetailSection title="Training Details">
        <RecordDetailField label="Training Topic" value={formData.trainingTitle} md={12} lg={12} />
        <RecordDetailField
          label="Training Type"
          value={formData.trainingTypeOption}
          md={3}
          lg={3}
        />
        <RecordDetailField label="Payment Method" value={formData.paymentMethod} md={3} lg={3} />
        <RecordDetailField
          label="Proposed Date"
          value={formatDateRange(formData, getDateOnly)}
          md={6}
          lg={6}
        />
        <RecordDetailField label="Training Venue" value={formData.trainingVenue} md={4} lg={4} />
        <RecordDetailField
          label="Target Participants"
          value={formData.targetGroups}
          md={4}
          lg={4}
        />
        <RecordDetailField
          label="Quotation Remarks"
          value={formData.trainingInqRemarks}
          md={4}
          lg={4}
        />
      </RecordDetailSection>

      <RecordPricingGovernanceSection serviceKey="training" record={record} />

      <RecordDetailSection title="Pricing Configuration">
        <RecordDetailField
          label="Pricing Category"
          value={getTrainingRateLabel(formData.trainingRateType)}
        />
        <RecordDetailField
          label="Travel Region"
          value={getTravelRegionLabel(formData.travelRegion)}
        />
        <RecordDetailField
          label="Pricing Basis"
          value={getPricingBasisLabel(formData.pricingBasis)}
        />
        {formData.pricingBasis !== 'per_pax' ? (
          <>
            <RecordDetailField label="Quantity" value={formData.sessionCount} />
            <RecordDetailField
              label="Duration"
              value={`${formData.trainingDuration || 0} ${formData.durationUnit || 'day(s)'}`}
            />
          </>
        ) : null}
        <RecordDetailField label="Participants" value={formData.noOfPax} />
        <RecordDetailField label="Unit Price" value={formatMoney(formData.unitPrice)} />
        <RecordDetailField
          label="Mobilization & Accommodation"
          value={formatMoney(formData.travelCharge)}
        />
        <RecordDetailField label="Participant Meals" value={mealsProvided ? 'Yes' : 'No'} />
        <RecordDetailField
          label="Meal Rate"
          value={
            mealsProvided ? `${formatMoney(formData.mealPrice)} per pax per day` : 'Not applicable'
          }
        />
        <RecordDetailField
          label="Discount"
          value={
            toFiniteNumber(record?.discountAmount ?? formData.discountValue) > 0
              ? `${formData.discountType || 'Applied'} — ${formatMoney(
                  record?.discountAmount ?? formData.discountValue,
                )}`
              : 'No discount'
          }
        />
        <RecordDetailField label="SST Rate" value={formatPercentage(formData.sstRate)} />
        <RecordDetailField label="HRD Rate" value={formatPercentage(formData.hrdCharge)} />
      </RecordDetailSection>

      <RecordDetailSection title="Quotation Calculation" bodyClassName="pt-0">
        <CCol xs={12}>
          <TrainingCommercialBreakdown record={record} />
        </CCol>
      </RecordDetailSection>
    </>
  )
}

export default TrainingRecordDetails
