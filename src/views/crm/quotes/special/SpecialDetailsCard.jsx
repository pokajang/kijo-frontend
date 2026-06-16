import React, { useState } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CCol,
  CFormLabel,
  CRow,
  CButton,
  CAlert,
  CFormTextarea,
  CFormInput,
  CFormSelect,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'
import Select from '../../../../components/forms/ThemedSelect'
import DataTableActionMenu from '../../../../components/datatable/DataTableActionMenu'
import { useNavigate } from 'react-router-dom'
import { useSpecialDetailsForm } from './formHandlers'
import { useQuoteRouteParams } from '../helpers/quoteRouteParams'

const specialLineItemUnits = ['Per Item', 'Lump Sum', 'Hour', 'Day', 'Location']

const createDefaultLineItem = () => ({
  title: '',
  description: '',
  unit: '',
  quantity: 1,
  unitPrice: 0,
  amount: 0,
})

const isValidLineItem = (item) => String(item.title || '').trim() !== ''

const normalizeLineItem = (item) => ({
  ...item,
  title: String(item.title || '').trim(),
  description: String(item.description || '').trim(),
  unit: String(item.unit || '').trim(),
  quantity: Number(item.quantity) || 1,
  unitPrice: Number(item.unitPrice) || 0,
  amount: Number(item.amount) || 0,
})

export default function SpecialDetailsCard({
  formData,
  setFormData,
  isEditMode = false,
  proposalLanguage = 'en',
}) {
  const navigate = useNavigate()
  const { isRevision } = useQuoteRouteParams()
  const { templates, handleTemplateSelect, handleRemove } = useSpecialDetailsForm(
    formData,
    setFormData,
    isEditMode,
    proposalLanguage,
  )
  const lineItems = Array.isArray(formData.lineItems) ? formData.lineItems : []
  const [isAddingLineItem, setIsAddingLineItem] = useState(false)
  const [newLineItem, setNewLineItem] = useState(createDefaultLineItem)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editLineItem, setEditLineItem] = useState(createDefaultLineItem)
  const selectedTemplate = templates.find((t) => Number(t.id) === Number(formData.specialId))
  const appendabilityMessage =
    formData.appendableProposalMessage || selectedTemplate?.appendableProposalMessage || ''
  const hasKnownAppendability =
    formData.hasAppendableProposal !== null && formData.hasAppendableProposal !== undefined
  const editServiceLabel = selectedTemplate
    ? `${selectedTemplate.serviceTitle} (${selectedTemplate.serviceCode})`
    : formData.serviceTitle
      ? `${formData.serviceTitle} (${formData.serviceCode})`
      : '--'

  const reactSelectOptions = templates.map((t) => ({
    value: t.id,
    label: `${t.serviceTitle} (${t.serviceCode})${t.proposalLanguage === 'ms-MY' ? ' [BM]' : ''}`,
    serviceTitle: t.serviceTitle,
    serviceCode: t.serviceCode,
  }))

  const handleSelectChange = (selected) => {
    if (!selected) {
      handleTemplateSelect({ target: { value: '' } })
    } else {
      handleTemplateSelect({ target: { value: selected.value } })
    }
  }

  const resetNewLineItem = () => {
    setNewLineItem(createDefaultLineItem())
  }

  const handleStartAddLineItem = () => {
    resetNewLineItem()
    setEditingIndex(null)
    setIsAddingLineItem(true)
  }

  const handleCancelNewLineItem = () => {
    resetNewLineItem()
    setIsAddingLineItem(false)
  }

  const handleAddLineItem = () => {
    if (!isValidLineItem(newLineItem)) return

    setFormData((prev) => ({
      ...prev,
      lineItems: [
        ...(Array.isArray(prev.lineItems) ? prev.lineItems : []),
        normalizeLineItem(newLineItem),
      ],
    }))
    resetNewLineItem()
    setIsAddingLineItem(false)
  }

  const handleStartEditLineItem = (index) => () => {
    setIsAddingLineItem(false)
    setEditingIndex(index)
    setEditLineItem({
      ...createDefaultLineItem(),
      ...(lineItems[index] || {}),
    })
  }

  const handleCancelEditLineItem = () => {
    setEditingIndex(null)
    setEditLineItem(createDefaultLineItem())
  }

  const handleSaveEditLineItem = () => {
    if (!isValidLineItem(editLineItem) || editingIndex === null) return

    setFormData((prev) => {
      const items = [...(Array.isArray(prev.lineItems) ? prev.lineItems : [])]
      const existing = items[editingIndex] || {}
      items[editingIndex] = normalizeLineItem({ ...existing, ...editLineItem })
      return { ...prev, lineItems: items }
    })
    handleCancelEditLineItem()
  }

  const renderLineItemFormRows = ({
    label,
    item,
    setItem,
    primaryLabel,
    primaryDisabled,
    onPrimary,
    onCancel,
  }) => (
    <React.Fragment>
      <CTableRow>
        <CTableDataCell>{label}</CTableDataCell>
        <CTableDataCell>
          <CFormTextarea
            placeholder="e.g. Site Audit - Basic"
            rows={1}
            value={item.title}
            onChange={(event) => setItem((prev) => ({ ...prev, title: event.target.value }))}
          />
        </CTableDataCell>
        <CTableDataCell>
          <CFormTextarea
            placeholder="Short description of this line item"
            rows={1}
            value={item.description}
            onChange={(event) => setItem((prev) => ({ ...prev, description: event.target.value }))}
          />
        </CTableDataCell>
        <CTableDataCell>
          <CFormSelect
            value={item.unit}
            onChange={(event) => setItem((prev) => ({ ...prev, unit: event.target.value }))}
          >
            <option value="">Unit</option>
            {specialLineItemUnits.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </CFormSelect>
        </CTableDataCell>
        <CTableDataCell className="record-action-cell text-center" />
      </CTableRow>
      <CTableRow>
        <CTableDataCell colSpan={5}>
          <div className="d-flex justify-content-end gap-2 flex-wrap">
            <CButton color="primary" size="sm" disabled={primaryDisabled} onClick={onPrimary}>
              {primaryLabel}
            </CButton>
            <CButton color="secondary" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </CButton>
          </div>
        </CTableDataCell>
      </CTableRow>
    </React.Fragment>
  )

  return (
    <CCard className="mb-0">
      <CCardHeader>
        <strong>Special Service Details</strong>
      </CCardHeader>
      <CCardBody>
        {isEditMode && (
          <CAlert color="primary">
            <strong>
              {isRevision
                ? 'You are revising the existing quotation. The quotation number will be appended with Rev xx.'
                : "You are editing the existing quotation. This won't change the quotation number."}
            </strong>
          </CAlert>
        )}

        {/* 1) Service Template */}
        <CRow className="g-3">
          <CCol md={12}>
            <CFormLabel htmlFor="specialServiceType">Special Service Type</CFormLabel>

            {!isEditMode ? (
              <Select
                id="specialServiceType"
                options={reactSelectOptions}
                value={
                  reactSelectOptions.find(
                    (opt) => String(opt.value) === String(formData.specialId),
                  ) || null
                }
                onChange={handleSelectChange}
                placeholder="Select special service..."
                isClearable
                noOptionsMessage={() => (
                  <span>
                    {proposalLanguage === 'ms-MY'
                      ? 'No reviewed BM special proposals available. Review and save the BM proposal first.'
                      : 'No special services found.'}{' '}
                    <CButton
                      color="primary"
                      size="sm"
                      className="p-1 m-0 align-baseline"
                      onClick={() => navigate('/templates/create')}
                    >
                      Create one?
                    </CButton>
                  </span>
                )}
              />
            ) : (
              <CFormInput readOnly value={editServiceLabel} />
            )}
            {appendabilityMessage && (
              <div
                className={`small mt-2 ${hasKnownAppendability && !formData.hasAppendableProposal ? 'text-danger' : 'text-muted'}`}
              >
                {appendabilityMessage}
              </div>
            )}
          </CCol>
        </CRow>

        {/* 2) General Remarks */}
        <CRow className="mt-3">
          <CCol>
            <CFormLabel>Quotation Remarks</CFormLabel>
            <CFormTextarea
              rows={2}
              value={formData.generalRemarks || ''}
              onChange={(e) => setFormData((p) => ({ ...p, generalRemarks: e.target.value }))}
              placeholder="Enter any general remarks for the quotation."
            />
          </CCol>
        </CRow>

        <div className="mt-4">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <strong>Line Items</strong>
            {!isAddingLineItem && (
              <CButton color="primary" size="sm" onClick={handleStartAddLineItem}>
                Add Line Item
              </CButton>
            )}
          </div>

          <div className="records-table-shell quote-line-items-table-shell overflow-hidden">
            {/* datatable-exempt: compact embedded quotation line-item table */}
            <CTable hover className="align-middle mb-0 records-table-compact">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: '48px' }}>#</CTableHeaderCell>
                  <CTableHeaderCell>Item Title</CTableHeaderCell>
                  <CTableHeaderCell>Description</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: '160px' }}>Unit</CTableHeaderCell>
                  <CTableHeaderCell
                    className="text-end"
                    style={{ width: '48px' }}
                    aria-label="Row actions"
                  >
                    <span className="visually-hidden">Actions</span>
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {lineItems.map((item, index) => {
                  if (editingIndex === index) {
                    return (
                      <React.Fragment key={item.id || index}>
                        {renderLineItemFormRows({
                          label: index + 1,
                          item: editLineItem,
                          setItem: setEditLineItem,
                          primaryLabel: 'Save',
                          primaryDisabled: !isValidLineItem(editLineItem),
                          onPrimary: handleSaveEditLineItem,
                          onCancel: handleCancelEditLineItem,
                        })}
                      </React.Fragment>
                    )
                  }

                  return (
                    <CTableRow key={item.id || index}>
                      <CTableDataCell>{index + 1}</CTableDataCell>
                      <CTableDataCell>{item.title || '-'}</CTableDataCell>
                      <CTableDataCell>{item.description || '-'}</CTableDataCell>
                      <CTableDataCell>{item.unit || '-'}</CTableDataCell>
                      <CTableDataCell
                        className="record-action-cell text-center"
                        data-no-row-open="true"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DataTableActionMenu
                          record={item}
                          actionKey={`special-line-item-${item.id || index}`}
                          ariaLabel={`Special line item actions for ${item.title || index + 1}`}
                          actions={[
                            {
                              key: 'edit',
                              label: 'Edit',
                              onClick: handleStartEditLineItem(index),
                            },
                            {
                              key: 'delete',
                              label: 'Delete',
                              danger: true,
                              onClick: () => handleRemove(index),
                            },
                          ]}
                        />
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
                {lineItems.length === 0 && !isAddingLineItem && (
                  <CTableRow>
                    <CTableDataCell colSpan={5} className="text-muted">
                      No line items added.
                    </CTableDataCell>
                  </CTableRow>
                )}
                {isAddingLineItem &&
                  renderLineItemFormRows({
                    label: 'New',
                    item: newLineItem,
                    setItem: setNewLineItem,
                    primaryLabel: 'Add',
                    primaryDisabled: !isValidLineItem(newLineItem),
                    onPrimary: handleAddLineItem,
                    onCancel: handleCancelNewLineItem,
                  })}
              </CTableBody>
            </CTable>
          </div>
        </div>
      </CCardBody>
    </CCard>
  )
}
