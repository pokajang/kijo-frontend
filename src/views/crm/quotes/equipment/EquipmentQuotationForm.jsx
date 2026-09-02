// src/views/crm/quotes/equipment/EquipmentQuotationForm.jsx

import React from 'react'
import { CAlert, CCol, CCard } from '@coreui/react'
import EquipmentSelection from './EquipmentSelection'
import PricingInput from './PricingInput'
import ReviewQuotation from './ReviewQuotation'
import { useEquipmentForm } from './actionHandlers'
import TrafficLightCard from '../shared/TrafficLightCard'
import { getTrafficLightStatus } from '../shared/trafficLightConfig'

export default function EquipmentQuotationForm({
  selectedClient,
  initialFormData = null,
  isEditMode = false,
  quoteId = null,
  proposalLanguage = 'en',
}) {
  const {
    selectOptions,
    selectedItems,
    handleSelectChange,
    quantities,
    handleQtyChange,
    unitPrices,
    markedUp,
    handleMarkedUpChange,
    itemRemarks,
    handleItemRemarksChange,
    quotationRemarks,
    setQuotationRemarks,
    deliveryCharge,
    setDeliveryCharge,
    miscCharge,
    setMiscCharge,
    discount,
    setDiscount,
    sstPercent,
    setSstPercent,
    estimatedTotalCost,
    setEstimatedTotalCost,
    itemsTotal,
    subtotal,
    sstAmount,
    grandTotal,
    handleSaveQuote,
    handleCancel,
  } = useEquipmentForm(selectedClient, {
    initialFormData,
    isEditMode,
    quoteId,
    proposalLanguage,
  })

  const hasEstimatedCost = Number(estimatedTotalCost) > 0
  const isLegacyMigration = Boolean(
    isEditMode && initialFormData?.issuanceContext?.requires_cost_on_edit,
  )
  const pricingCardStatus = getTrafficLightStatus({
    serviceKey: 'equipment',
    estimatedTotalCost,
    quoteTotal: grandTotal,
  }).status
  const requiresApproval = pricingCardStatus === 'yellow' || pricingCardStatus === 'red'
  const saveLabel = requiresApproval
    ? isEditMode
      ? 'Update & Apply Approval'
      : 'Save & Apply Approval'
    : undefined

  return (
    <CCol md={12}>
      <CCard className="mb-4">
        {isLegacyMigration && (
          <CAlert color="warning" className="m-3 mb-0" role="status">
            <strong>Estimated internal cost required.</strong> Saving this legacy quotation will
            move it to the current approval policy. Enter the estimated total cost below to
            continue; cancelling leaves the original quotation unchanged.
          </CAlert>
        )}

        <EquipmentSelection
          isEditMode={isEditMode}
          selectOptions={selectOptions}
          selectedItems={selectedItems}
          handleSelectChange={handleSelectChange}
          quotationRemarks={quotationRemarks}
          onQuotationRemarksChange={setQuotationRemarks}
          isDisabled={isEditMode}
        />

        <TrafficLightCard
          serviceKey="equipment"
          estimatedTotalCost={estimatedTotalCost}
          onEstimatedTotalCostChange={setEstimatedTotalCost}
        />

        {hasEstimatedCost && (
          <PricingInput
            selectedItems={selectedItems}
            quantities={quantities}
            handleQtyChange={handleQtyChange}
            unitPrices={unitPrices}
            markedUp={markedUp}
            trafficLightStatus={pricingCardStatus}
            handleMarkedUpChange={handleMarkedUpChange}
            itemRemarks={itemRemarks}
            handleItemRemarksChange={handleItemRemarksChange}
            deliveryCharge={deliveryCharge}
            setDeliveryCharge={setDeliveryCharge}
            miscCharge={miscCharge}
            setMiscCharge={setMiscCharge}
            discount={discount}
            setDiscount={setDiscount}
            sstPercent={sstPercent}
            setSstPercent={setSstPercent}
            itemsTotal={itemsTotal}
            subtotal={subtotal}
            sstAmount={sstAmount}
            grandTotal={grandTotal}
          />
        )}

        {hasEstimatedCost && (
          <ReviewQuotation
            selectedItems={selectedItems}
            quantities={quantities}
            markedUp={markedUp}
            itemRemarks={itemRemarks}
            quotationRemarks={quotationRemarks}
            deliveryCharge={deliveryCharge}
            miscCharge={miscCharge}
            discount={discount}
            sstPercent={sstPercent}
            subtotal={subtotal}
            sstAmount={sstAmount}
            grandTotal={grandTotal}
            estimatedTotalCost={estimatedTotalCost}
            onSave={handleSaveQuote}
            onCancel={handleCancel}
            isEditMode={isEditMode}
            saveLabel={saveLabel}
            requiresApproval={requiresApproval}
          />
        )}
      </CCard>
    </CCol>
  )
}
