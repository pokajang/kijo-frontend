// src/views/crm/purchase/SupplierPo.js
import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CCard,
  CAlert,
  CCardHeader,
  CCardBody,
  CCardFooter,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CRow,
  CCol,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CButton,
} from '@coreui/react'
import { components } from 'react-select'
import Select from '../../../components/forms/ThemedSelect'
import { useSupplierPoServices } from './services'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import {
  catalogModuleTabs,
  commercialModuleTabs,
} from '../../../components/navigation/moduleNavConfigs'

export default function SupplierPo({
  module = 'catalog',
  initialProjectId,
  initialProject,
  lockProject = false,
  onCreated,
} = {}) {
  const {
    supplierList,
    selectedSupplier,
    selectedProject,
    handleSupplierChange,
    catalogItems,
    selectedItems,
    handleItemsChange,
    quantities,
    handleQtyChange,
    unitPrices,
    handlePriceChange,
    discount,
    setDiscount,
    deliveryCharge,
    setDeliveryCharge,
    sstPercent,
    setSstPercent,
    subtotal,
    sstAmount,
    grandTotal,
    projectList,
    handleProjectChange,
    handleReset,
    handleSave,
    quotationRemarks,
    setQuotationRemarks,
    equipmentSnapshotItem,
  } = useSupplierPoServices({
    initialProjectId,
    initialProject,
    lockProject,
    onCreated,
  })

  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}${location.hash}`

  // Custom no-options action for the supplier select.
  const NoOptionsMessageSupplier = (props) => (
    <components.NoOptionsMessage {...props}>
      No options.{' '}
      <CButton
        size="sm"
        color="primary"
        onClick={() => navigate('/vendor/create', { state: { returnTo } })}
      >
        Create One?
      </CButton>
    </components.NoOptionsMessage>
  )

  // Custom no-options action for the catalog item select.
  const NoOptionsMessageItems = (props) => (
    <components.NoOptionsMessage {...props}>
      No options.{' '}
      <CButton
        size="sm"
        color="primary"
        onClick={() => navigate('/catalog/create', { state: { returnTo } })}
      >
        Create One?
      </CButton>
    </components.NoOptionsMessage>
  )

  return (
    <>
      <ModuleNavStrip
        tabs={module === 'commercial' ? commercialModuleTabs : catalogModuleTabs}
        ariaLabel={module === 'commercial' ? 'Commercial sections' : 'Catalog sections'}
      />
      <CCard className="mb-4">
        {/* Supplier & Project */}
        <CCardHeader>
          <strong>
            {module === 'commercial' ? 'Create Supplier PO' : 'Select Supplier and Project'}
          </strong>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={12}>
              <CAlert color="warning" dismissible>
                <strong>If no entries found.</strong> Please add a supplier or equipment item before
                proceeding.
              </CAlert>
            </CCol>
            <CCol xs={12} md={8}>
              <CFormLabel htmlFor="supplier-select">Select Supplier</CFormLabel>
              <Select
                inputId="supplier-select"
                options={supplierList}
                value={selectedSupplier}
                onChange={handleSupplierChange}
                placeholder="Select supplier..."
                components={{ NoOptionsMessage: NoOptionsMessageSupplier }}
              />
              {selectedSupplier && (
                <CRow className="mt-3">
                  <CCol md={8}>
                    <CFormLabel>Company Name</CFormLabel>
                    <div>{selectedSupplier.value.company_name || '-'}</div>
                    <div className="text-muted small">
                      {selectedSupplier.value.full_address || '-'}
                    </div>
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Contact Person</CFormLabel>
                    <div>{selectedSupplier.value.contact_name || '-'}</div>
                    <div className="text-muted small">
                      {selectedSupplier.value.contact_number || '-'}
                    </div>
                  </CCol>
                </CRow>
              )}
            </CCol>

            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="project-select">Select Project / Purpose</CFormLabel>
              <Select
                inputId="project-select"
                options={
                  lockProject
                    ? projectList
                    : [
                        {
                          label: 'Not for project',
                          value: { project_id: null, project_name: 'Not project' },
                        },
                        ...projectList,
                      ]
                }
                value={selectedProject}
                onChange={handleProjectChange}
                isDisabled={lockProject}
                placeholder="Select project..."
              />
              {selectedProject && (
                <CRow className="mt-3">
                  <CCol>
                    <CFormLabel>Project Name</CFormLabel>
                    <br />
                    {selectedProject.value.project_name || '-'}
                  </CCol>
                </CRow>
              )}
              {selectedProject?.value?.project_type === 'Equipment Supply' && (
                <div className="mt-3">
                  <CFormLabel>Quotation Remarks</CFormLabel>
                  <CFormTextarea
                    rows={3}
                    maxLength={2000}
                    value={quotationRemarks}
                    onChange={(event) => setQuotationRemarks(event.target.value)}
                    placeholder="General specifications carried from the equipment quotation"
                  />
                </div>
              )}
            </CCol>
          </CRow>
        </CCardBody>

        {/* Equipment Selection */}
        <CCardHeader>
          <strong>Select Equipment</strong>
        </CCardHeader>
        <CCardBody>
          <Select
            options={catalogItems}
            value={selectedItems}
            onChange={handleItemsChange}
            placeholder="Select equipment..."
            isMulti
            closeMenuOnSelect={false}
            hideSelectedOptions
            components={{ NoOptionsMessage: NoOptionsMessageItems }}
          />
        </CCardBody>

        {/* Review PO Details */}
        <CCardHeader>
          <strong>Review PO Details</strong>
        </CCardHeader>
        <CCardBody>
          {selectedItems && selectedItems.length > 0 ? (
            <>
              {/* datatable-exempt: existing embedded/layout table */}
              <CTable hover responsive className="data-table-compact embedded-data-table">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell className="text-center">#</CTableHeaderCell>
                    <CTableHeaderCell>Item</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Unit</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Qty</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Unit Price (RM)</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Line Total (RM)</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {selectedItems.map(({ value: item }, idx) => {
                    const snapshotItem = equipmentSnapshotItem(item)
                    const qty = quantities[item.id] || 0
                    const price = unitPrices[item.id] || 0
                    return (
                      <CTableRow key={item.id}>
                        <CTableHeaderCell className="text-center">{idx + 1}</CTableHeaderCell>
                        <CTableDataCell>
                          <strong>{item.item_name}</strong>
                          <br />
                          <small>{snapshotItem?.description ?? item.description ?? ''}</small>
                          {(snapshotItem?.item_remarks ?? item.item_remarks) && (
                            <div className="small mt-1">
                              <strong>Specifications / Remarks:</strong>{' '}
                              {snapshotItem?.item_remarks ?? item.item_remarks}
                            </div>
                          )}
                        </CTableDataCell>
                        <CTableDataCell className="text-center">{item.unit}</CTableDataCell>
                        <CTableDataCell className="text-center">
                          <CFormInput
                            type="number"
                            min="0"
                            value={qty}
                            onChange={(e) => handleQtyChange(item.id, e.target.value)}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput
                            type="number"
                            step="0.01"
                            min="0"
                            value={price}
                            onChange={(e) => handlePriceChange(item.id, e.target.value)}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          {(qty * price).toFixed(2)}
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}

                  {/* Summary rows */}
                  <CTableRow>
                    <CTableHeaderCell colSpan={5} className="text-end">
                      Discount
                    </CTableHeaderCell>
                    <CTableDataCell className="text-end">
                      <CFormInput
                        type="number"
                        step="0.01"
                        min="0"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      />
                    </CTableDataCell>
                  </CTableRow>

                  <CTableRow>
                    <CTableHeaderCell colSpan={5} className="text-end">
                      Delivery Charge
                    </CTableHeaderCell>
                    <CTableDataCell className="text-end">
                      <CFormInput
                        type="number"
                        step="0.01"
                        min="0"
                        value={deliveryCharge}
                        onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
                      />
                    </CTableDataCell>
                  </CTableRow>

                  <CTableRow>
                    <CTableHeaderCell colSpan={5} className="text-end">
                      SST (%)
                    </CTableHeaderCell>
                    <CTableDataCell className="text-end">
                      <CFormInput
                        type="number"
                        step="0.01"
                        min="0"
                        value={sstPercent}
                        onChange={(e) => setSstPercent(parseFloat(e.target.value) || 0)}
                      />
                    </CTableDataCell>
                  </CTableRow>

                  <CTableRow>
                    <CTableHeaderCell colSpan={5} className="text-end">
                      SST Amount (RM)
                    </CTableHeaderCell>
                    <CTableDataCell className="text-end">{sstAmount.toFixed(2)}</CTableDataCell>
                  </CTableRow>

                  <CTableRow>
                    <CTableHeaderCell colSpan={5} className="text-end">
                      <strong>Grand Total</strong>
                    </CTableHeaderCell>
                    <CTableDataCell className="text-end">
                      <strong>{grandTotal.toFixed(2)}</strong>
                    </CTableDataCell>
                  </CTableRow>
                </CTableBody>
              </CTable>
            </>
          ) : (
            <p>No items selected.</p>
          )}
        </CCardBody>
        {selectedItems && selectedItems.length > 0 && (
          <CCardFooter className="d-flex justify-content-end gap-2">
            <CButton color="secondary" variant="outline" size="sm" onClick={handleReset}>
              Reset
            </CButton>
            <CButton color="primary" size="sm" onClick={handleSave}>
              Create PO
            </CButton>
          </CCardFooter>
        )}
      </CCard>
    </>
  )
}
