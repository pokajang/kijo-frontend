// src/views/crm/quotes/equipment/EquipmentQuotationForm.jsx

import React from 'react'
import { CCol, CCard } from '@coreui/react'
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
    deliveryCharge,
    setDeliveryCharge,
    miscCharge,
    setMiscCharge,
    discount,
    setDiscount,
    sstPercent,
    setSstPercent,
    attachProposal,
    setAttachProposal,
    estimatedTotalCost,
    setEstimatedTotalCost,
    trafficLightRuleVersion,
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
        <EquipmentSelection
          isEditMode={isEditMode}
          selectOptions={selectOptions}
          selectedItems={selectedItems}
          handleSelectChange={handleSelectChange}
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
            deliveryCharge={deliveryCharge}
            miscCharge={miscCharge}
            discount={discount}
            sstPercent={sstPercent}
            subtotal={subtotal}
            sstAmount={sstAmount}
            grandTotal={grandTotal}
            estimatedTotalCost={estimatedTotalCost}
            attachProposal={attachProposal}
            onAttachProposalChange={setAttachProposal}
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
