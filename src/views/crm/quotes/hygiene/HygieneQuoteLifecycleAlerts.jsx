import React, { useCallback } from 'react'

import dialog from '../../../../components/dialog/dialogService'
import QuoteLifecycleRemediation from './QuoteLifecycleRemediation'

const HygieneQuoteLifecycleAlerts = ({
  formData,
  hasKnownPricingRule,
  isHistoricalPricing,
  historicalPricingInputsChanged,
  pricingChangeConfirmed,
  onConfirmRecalculation,
  onRestoreHistoricalPricing,
  onFocusEstimatedCost,
  saveRemediation,
  onRetrySave,
}) => {
  const openLatestQuote = useCallback(() => {
    const latestWindow = window.open(window.location.href, '_blank')
    if (!latestWindow) {
      dialog.alert(
        'The browser blocked the new tab. Copy your unsaved form data before reloading this page.',
      )
    } else {
      latestWindow.opener = null
    }
  }, [])

  const copyUnsavedFormData = useCallback(async () => {
    const serialized = JSON.stringify(formData, null, 2)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(serialized)
      await dialog.alert('Unsaved quotation data copied to the clipboard.')
    } catch {
      await dialog.prompt('Copy the unsaved quotation data below before leaving this page.', {
        title: 'Unsaved Quotation Data',
        defaultValue: serialized,
      })
    }
  }, [formData])

  return (
    <>
      {!hasKnownPricingRule && (
        <QuoteLifecycleRemediation
          color="danger"
          title="Financial editing is temporarily unavailable"
          message="This quotation has an unsupported pricing rule. Its stored values have not been changed."
          primaryLabel="Open Latest Quotation"
          onPrimary={openLatestQuote}
          secondaryLabel="Copy Pricing Rule"
          onSecondary={() =>
            dialog.alert(`Pricing rule: ${String(formData.pricingRuleVersion || 'unknown')}`)
          }
        />
      )}

      {isHistoricalPricing && historicalPricingInputsChanged && !pricingChangeConfirmed && (
        <QuoteLifecycleRemediation
          title="Historical pricing inputs changed"
          message="Stored totals are still being preserved. Confirm before recalculating, or restore the original pricing values."
          primaryLabel="Continue and Recalculate"
          onPrimary={onConfirmRecalculation}
          secondaryLabel="Restore Original Pricing"
          onSecondary={onRestoreHistoricalPricing}
        />
      )}

      {formData.upgradePricingRule && (
        <QuoteLifecycleRemediation
          color="info"
          title="V2 pricing upgrade preview"
          message="The upgrade is not permanent until the quotation saves successfully. You can still return to the stored historical pricing."
          primaryLabel="Enter Estimated Cost"
          onPrimary={onFocusEstimatedCost}
          secondaryLabel="Cancel Upgrade"
          onSecondary={onRestoreHistoricalPricing}
        />
      )}

      {['QUOTE_SAVE_FAILED', 'QUOTE_NETWORK_ERROR'].includes(saveRemediation?.error_code) && (
        <QuoteLifecycleRemediation
          color="danger"
          title="Quotation was not saved"
          message={saveRemediation.message}
          primaryLabel="Retry Save"
          onPrimary={onRetrySave}
          secondaryLabel="Copy Unsaved Form Data"
          onSecondary={copyUnsavedFormData}
        />
      )}

      {saveRemediation?.error_code === 'ESTIMATED_COST_REQUIRED' && (
        <QuoteLifecycleRemediation
          title="Estimated cost is required"
          message={saveRemediation.message}
          primaryLabel="Enter Estimated Cost"
          onPrimary={onFocusEstimatedCost}
          secondaryLabel="Return to Historical Pricing"
          onSecondary={onRestoreHistoricalPricing}
        />
      )}
    </>
  )
}

export default HygieneQuoteLifecycleAlerts
