import { getQuoteServiceFromRecordTab } from '../config/recordTabs'
import { getTrafficLightStatus } from '../../quotes/shared/trafficLightConfig'

const approvalStepLabel = (step) =>
  String(step || 'required')
    .trim()
    .toUpperCase()

export const getQuoteIssuanceState = (record) => {
  if (record?.approvalStatusUnavailable) {
    return {
      blocked: true,
      message: 'Approval status could not be verified. Refresh the quotation before issuing it.',
    }
  }

  const approval = record?.approval
  if (approval?.can_issue === false) {
    return {
      blocked: true,
      message:
        approval.status === 'rejected'
          ? 'Revise this rejected quotation before issuing it.'
          : `${approvalStepLabel(approval.required_step)} approval is pending.`,
    }
  }

  if (approval?.can_issue === true) {
    return { blocked: false, message: '' }
  }

  const serviceKey = getQuoteServiceFromRecordTab(record?.serviceTab)
  if (serviceKey !== 'equipment') {
    return { blocked: false, message: '' }
  }

  const estimatedTotalCost = record?.estimatedCost ?? record?.formData?.estimatedTotalCost
  const quoteTotal = record?.grandTotal ?? record?.amount
  const pricingDecision = getTrafficLightStatus({
    serviceKey,
    estimatedTotalCost,
    quoteTotal,
  })

  if (!pricingDecision.hasEstimate) {
    return {
      blocked: true,
      message: 'Estimated cost is missing, so approval must be completed before issuing the quote.',
    }
  }

  if (pricingDecision.status === 'yellow') {
    return { blocked: true, message: 'HOD approval is required before issuing this quote.' }
  }

  if (pricingDecision.status === 'red') {
    return { blocked: true, message: 'BD approval is required before issuing this quote.' }
  }

  return { blocked: false, message: '' }
}
