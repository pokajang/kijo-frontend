// src/views/crm/quotes/equipment/EquipmentQuotationForm.jsx

import React from 'react'
import { CCol, CCard } from '@coreui/react'
import EquipmentSelection from './EquipmentSelection'
import PricingInput from './PricingInput'
import ReviewQuotation from './ReviewQuotation'
import { useEquipmentForm } from './actionHandlers'

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

        <PricingInput
          selectedItems={selectedItems}
          quantities={quantities}
          handleQtyChange={handleQtyChange}
          unitPrices={unitPrices}
          markedUp={markedUp}
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
          attachProposal={attachProposal}
          onAttachProposalChange={setAttachProposal}
          onSave={handleSaveQuote}
          onCancel={handleCancel}
          isEditMode={isEditMode}
        />
      </CCard>
    </CCol>
  )
}
