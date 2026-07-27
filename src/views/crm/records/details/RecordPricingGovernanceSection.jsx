import React from 'react'
import { CBadge } from '@coreui/react'
import { getTrafficLightStatus } from '../../quotes/shared/trafficLightConfig'
import RecordDetailSection, { RecordDetailField } from './RecordDetailSection'
import { formatMoney, formatPercentage, hasValue, toFiniteNumber } from './quotationDetailUtils'

const trafficDecision = {
  green: { color: 'success', label: 'Green — Can issue' },
  yellow: { color: 'warning', label: 'Yellow — HOD approval required' },
  red: { color: 'danger', label: 'Red — BD final approval required' },
  unknown: { color: 'secondary', label: 'Decision unavailable' },
}

const RecordPricingGovernanceSection = ({ serviceKey, record }) => {
  const formData = record?.formData || {}
  const grandTotal = toFiniteNumber(record?.grandTotal ?? record?.amount)
  const estimatedCost = record?.estimatedCost ?? formData.estimatedTotalCost
  const pricingDecision = getTrafficLightStatus({
    serviceKey,
    quoteTotal: grandTotal,
    estimatedTotalCost: estimatedCost,
  })
  const decision = trafficDecision[pricingDecision.status] || trafficDecision.unknown
  const difference =
    pricingDecision.hasEstimate && hasValue(pricingDecision.estimatedTotalCost)
      ? grandTotal - pricingDecision.estimatedTotalCost
      : null

  return (
    <RecordDetailSection title="Pricing Governance">
      <RecordDetailField
        label="Estimated Cost"
        value={pricingDecision.hasEstimate ? formatMoney(estimatedCost) : 'Not provided'}
      />
      <RecordDetailField label="Quoted Total" value={formatMoney(grandTotal)} />
      <RecordDetailField
        label="Difference"
        value={difference === null ? 'Not available' : formatMoney(difference)}
        valueClassName={difference !== null && difference < 0 ? 'text-danger' : ''}
      />
      <RecordDetailField
        label="Margin"
        value={
          pricingDecision.marginPercent === null
            ? 'Not available'
            : formatPercentage(pricingDecision.marginPercent)
        }
      />
      <RecordDetailField label="Traffic-light Decision">
        <CBadge color={decision.color}>{decision.label}</CBadge>
      </RecordDetailField>
      <RecordDetailField label="Rule Version" value={formData.trafficLightRuleVersion || 'v1'} />
      {record?.priceExceptionRequestId ? (
        <RecordDetailField
          label="Negotiation Request"
          value={`#${record.priceExceptionRequestId}`}
        />
      ) : null}
    </RecordDetailSection>
  )
}

export default RecordPricingGovernanceSection
