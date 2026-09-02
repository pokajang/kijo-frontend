import React from 'react'
import {
  CButton,
  CFormInput,
  CFormTextarea,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { formatMoney } from '../../../utils/formatters/numberFormatters'

const SupplierPoEditItems = ({ items, onItemChange, onAddItem, onRemoveItem }) => (
  <div className="supplier-po-edit-items-shell">
    <CTable responsive className="data-table-compact embedded-data-table supplier-po-edit-items">
      <CTableHead>
        <CTableRow>
          <CTableHeaderCell>Item</CTableHeaderCell>
          <CTableHeaderCell>Description / Remarks</CTableHeaderCell>
          <CTableHeaderCell>Unit</CTableHeaderCell>
          <CTableHeaderCell>Qty</CTableHeaderCell>
          <CTableHeaderCell>Unit Price</CTableHeaderCell>
          <CTableHeaderCell className="text-end">Total</CTableHeaderCell>
          <CTableHeaderCell className="text-end">Action</CTableHeaderCell>
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {items.length === 0 ? (
          <CTableRow className="supplier-po-edit-item supplier-po-edit-item--empty">
            <CTableDataCell colSpan={7} className="supplier-po-edit-item-cell--empty">
              No line items yet. Add an item to continue.
            </CTableDataCell>
          </CTableRow>
        ) : (
          items.map((item, index) => (
            <CTableRow className="supplier-po-edit-item" key={`${item.item_id || 'item'}-${index}`}>
              <CTableDataCell data-label="Item" className="supplier-po-edit-item-cell--name">
                <CFormInput
                  aria-label={`Item ${index + 1} name`}
                  value={item.item_name}
                  onChange={(event) => onItemChange(index, 'item_name', event.target.value)}
                />
              </CTableDataCell>
              <CTableDataCell
                data-label="Description / Remarks"
                className="supplier-po-edit-item-cell--description"
              >
                <CFormTextarea
                  aria-label={`Item ${index + 1} description`}
                  rows={2}
                  value={item.description}
                  onChange={(event) => onItemChange(index, 'description', event.target.value)}
                />
                <CFormTextarea
                  className="mt-2"
                  aria-label={`Item ${index + 1} remarks`}
                  rows={2}
                  value={item.item_remarks}
                  onChange={(event) => onItemChange(index, 'item_remarks', event.target.value)}
                />
              </CTableDataCell>
              <CTableDataCell data-label="Unit" className="supplier-po-edit-item-cell--unit">
                <CFormInput
                  aria-label={`Item ${index + 1} unit`}
                  value={item.unit}
                  onChange={(event) => onItemChange(index, 'unit', event.target.value)}
                />
              </CTableDataCell>
              <CTableDataCell
                data-label="Quantity"
                className="supplier-po-edit-item-cell--quantity"
              >
                <CFormInput
                  aria-label={`Item ${index + 1} quantity`}
                  type="number"
                  min="0"
                  value={item.quantity}
                  onChange={(event) => onItemChange(index, 'quantity', event.target.value)}
                />
              </CTableDataCell>
              <CTableDataCell
                data-label="Unit Price"
                className="supplier-po-edit-item-cell--unit-price"
              >
                <CFormInput
                  aria-label={`Item ${index + 1} unit price`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={(event) => onItemChange(index, 'unit_price', event.target.value)}
                />
              </CTableDataCell>
              <CTableDataCell
                data-label="Line Total"
                className="text-end supplier-po-edit-item-cell--total"
              >
                {formatMoney(Number(item.quantity || 0) * Number(item.unit_price || 0))}
              </CTableDataCell>
              <CTableDataCell
                data-label="Action"
                className="text-end supplier-po-edit-item-cell--action"
              >
                <CButton
                  className="supplier-po-edit-touch-action"
                  color="danger"
                  size="sm"
                  variant="outline"
                  disabled={items.length === 1}
                  onClick={() => onRemoveItem(index)}
                >
                  Remove
                </CButton>
              </CTableDataCell>
            </CTableRow>
          ))
        )}
      </CTableBody>
    </CTable>
    <CButton
      className="supplier-po-edit-touch-action"
      color="primary"
      size="sm"
      variant="outline"
      onClick={onAddItem}
    >
      Add Item
    </CButton>
  </div>
)

export default SupplierPoEditItems
