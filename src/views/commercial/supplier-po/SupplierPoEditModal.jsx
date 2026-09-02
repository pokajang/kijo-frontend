import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CCol,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import { formatMoney } from '../../../utils/formatters/numberFormatters'
import SupplierPoEditItems from './SupplierPoEditItems'

const emptyDraft = {
  supplier_name: '',
  supplier_address: '',
  supplier_contact_name: '',
  supplier_contact_number: '',
  quotation_remarks: '',
  discount: 0,
  delivery_charge: 0,
  sst_percent: 0,
  items: [],
}

const SupplierPoEditModal = ({ visible, record, submitting = false, onClose, onSave }) => {
  const [draft, setDraft] = useState(emptyDraft)

  useEffect(() => {
    if (!record) return
    setDraft({
      supplier_name: record.supplier_name || '',
      supplier_address: record.supplier_address || '',
      supplier_contact_name: record.supplier_contact_name || '',
      supplier_contact_number: record.supplier_contact_number || '',
      quotation_remarks: record.quotation_remarks || '',
      discount: Number(record.discount || 0),
      delivery_charge: Number(record.delivery_charge || 0),
      sst_percent: Number(record.sst_percent || 0),
      items: (Array.isArray(record.items) ? record.items : []).map((item) => ({
        item_id: item.item_id || null,
        item_name: item.item_name || '',
        description: item.description || '',
        item_remarks: item.item_remarks || '',
        unit: item.unit || '',
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
      })),
    })
  }, [record])

  const totals = useMemo(() => {
    const subtotal = draft.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
      0,
    )
    const taxable =
      Math.max(0, subtotal - Number(draft.discount || 0)) + Number(draft.delivery_charge || 0)
    const sstAmount = taxable * (Number(draft.sst_percent || 0) / 100)
    return { subtotal, sstAmount, grandTotal: taxable + sstAmount }
  }, [draft])

  const updateField = (field, value) => setDraft((current) => ({ ...current, [field]: value }))
  const updateItem = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }))
  }
  const addItem = () => {
    setDraft((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          item_id: null,
          item_name: '',
          description: '',
          item_remarks: '',
          unit: '',
          quantity: 1,
          unit_price: 0,
        },
      ],
    }))
  }
  const removeItem = (index) => {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const canSave =
    draft.supplier_name.trim() !== '' &&
    draft.items.length > 0 &&
    draft.items.every(
      (item) =>
        item.item_name.trim() !== '' && Number(item.quantity) >= 0 && Number(item.unit_price) >= 0,
    ) &&
    Number(draft.discount || 0) <= totals.subtotal

  const handleSave = () => {
    if (!canSave) return
    onSave?.({
      project_id: record.project_id || null,
      quotation_remarks: draft.quotation_remarks,
      supplier: {
        id: record.supplier_id || null,
        company_name: draft.supplier_name,
        full_address: draft.supplier_address,
        contact_name: draft.supplier_contact_name,
        contact_number: draft.supplier_contact_number,
      },
      items: draft.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
        line_total: Number(item.quantity || 0) * Number(item.unit_price || 0),
      })),
      discount: Number(draft.discount || 0),
      delivery_charge: Number(draft.delivery_charge || 0),
      sst_percent: Number(draft.sst_percent || 0),
      sst_amount: totals.sstAmount,
      grand_total: totals.grandTotal,
    })
  }

  return (
    <CModal
      className="supplier-po-edit-modal"
      visible={visible}
      onClose={onClose}
      size="xl"
      alignment="center"
      scrollable
    >
      <CModalHeader closeButton>
        <CModalTitle>Edit Supplier PO {record?.po_ref_no || ''}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CRow className="g-3 mb-4">
          <CCol xs={12} md={6}>
            <CFormLabel htmlFor="supplierPoEditSupplier">Supplier</CFormLabel>
            <CFormInput
              id="supplierPoEditSupplier"
              value={draft.supplier_name}
              onChange={(event) => updateField('supplier_name', event.target.value)}
            />
          </CCol>
          <CCol xs={12} md={6}>
            <CFormLabel htmlFor="supplierPoEditContact">Contact</CFormLabel>
            <CFormInput
              id="supplierPoEditContact"
              value={draft.supplier_contact_name}
              onChange={(event) => updateField('supplier_contact_name', event.target.value)}
            />
          </CCol>
          <CCol xs={12} md={6}>
            <CFormLabel htmlFor="supplierPoEditAddress">Address</CFormLabel>
            <CFormTextarea
              id="supplierPoEditAddress"
              rows={2}
              value={draft.supplier_address}
              onChange={(event) => updateField('supplier_address', event.target.value)}
            />
          </CCol>
          <CCol xs={12} md={6}>
            <CFormLabel htmlFor="supplierPoEditPhone">Phone</CFormLabel>
            <CFormInput
              id="supplierPoEditPhone"
              value={draft.supplier_contact_number}
              onChange={(event) => updateField('supplier_contact_number', event.target.value)}
            />
          </CCol>
          <CCol xs={12}>
            <CFormLabel htmlFor="supplierPoEditQuotationRemarks">Quotation Remarks</CFormLabel>
            <CFormTextarea
              id="supplierPoEditQuotationRemarks"
              rows={2}
              maxLength={2000}
              value={draft.quotation_remarks}
              onChange={(event) => updateField('quotation_remarks', event.target.value)}
            />
          </CCol>
        </CRow>

        <SupplierPoEditItems
          items={draft.items}
          onItemChange={updateItem}
          onAddItem={addItem}
          onRemoveItem={removeItem}
        />

        <CRow className="g-3 justify-content-end mt-2">
          {[
            ['discount', 'Discount'],
            ['delivery_charge', 'Delivery Charge'],
            ['sst_percent', 'SST (%)'],
          ].map(([field, label]) => (
            <CCol xs={12} sm={4} md={3} key={field}>
              <CFormLabel htmlFor={`supplierPoEdit-${field}`}>{label}</CFormLabel>
              <CFormInput
                id={`supplierPoEdit-${field}`}
                type="number"
                min="0"
                step="0.01"
                value={draft[field]}
                onChange={(event) => updateField(field, event.target.value)}
              />
            </CCol>
          ))}
          <CCol xs={12} md={3} className="d-flex flex-column justify-content-end">
            <div className="small text-body-secondary">Grand Total</div>
            <div className="fw-semibold">{formatMoney(totals.grandTotal)}</div>
          </CCol>
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton
          color="secondary"
          size="sm"
          variant="outline"
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </CButton>
        <CButton color="primary" size="sm" onClick={handleSave} disabled={!canSave || submitting}>
          {submitting ? 'Saving...' : 'Save Changes'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default SupplierPoEditModal
