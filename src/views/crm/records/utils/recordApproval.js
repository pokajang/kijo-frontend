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
  const issuanceContext = record?.issuanceContext || record?.issuance_context
  const approvalUsesCurrentPolicy =
    !approval ||
    !issuanceContext?.rule_version ||
    !approval?.rule_version ||
    approval.rule_version === issuanceContext.rule_version

  if (approvalUsesCurrentPolicy && approval?.can_issue === false) {
    return {
      blocked: true,
      message:
        approval.status === 'rejected'
          ? 'Revise this rejected quotation before issuing it.'
          : `${approvalStepLabel(approval.required_step)} approval is pending.`,
    }
  }

  if (approvalUsesCurrentPolicy && approval?.can_issue === true) {
    return { blocked: false, message: '' }
  }

  const serviceKey = getQuoteServiceFromRecordTab(record?.serviceTab)

  if (issuanceContext?.estimated_cost_required) {
    return {
      blocked: true,
      message: 'Add an estimated total cost before issuing this current-policy quotation.',
    }
  }

  if (issuanceContext?.requires_approval) {
    const step = approvalStepLabel(issuanceContext.required_step)
    const reason = Array.isArray(issuanceContext.reasons) ? issuanceContext.reasons.at(-1) : ''
    return {
      blocked: true,
      message: reason ? `${step} approval is required. ${reason}` : `${step} approval is required.`,
    }
  }

  if (issuanceContext) {
    return { blocked: false, message: '' }
  }

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
