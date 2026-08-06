import React, { useMemo } from 'react'
import Select from '../../../../components/forms/ThemedSelect'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCardBody,
  CCardHeader,
  CCol,
  CFormLabel,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import { useQuoteRouteParams } from '../helpers/quoteRouteParams'

export default function EquipmentSelection({
  selectOptions,
  selectedItems,
  handleSelectChange,
  quotationRemarks = '',
  onQuotationRemarksChange = () => {},
  isEditMode = false,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isRevision } = useQuoteRouteParams()
  const returnTo = `${location.pathname}${location.search}${location.hash}`

  // 1) Memoize a version of options that removes already selected ones
  const filteredOptions = useMemo(
    () =>
      selectOptions.filter((opt) => !selectedItems.some((sel) => sel.value.id === opt.value.id)),
    [selectOptions, selectedItems],
  )

  return (
    <>
      <CCardHeader>
        <strong>Equipment Supply List</strong>
      </CCardHeader>
      <CCardBody>
        {isEditMode && (
          <CRow>
            <CCol>
              <CAlert color="primary">
                <strong>
                  {isRevision
                    ? 'You are revising the existing quotation. The quotation number will be appended with Rev xx.'
                    : "You are editing the existing quotation. This won't change the quotation number."}
                </strong>
              </CAlert>
            </CCol>
          </CRow>
        )}
        <CRow className="mb-3">
          <CCol md={12}>
            <CFormLabel htmlFor="equipmentSelect">Select Item</CFormLabel>
            <Select
              id="equipmentSelect"
              options={filteredOptions}
              value={selectedItems}
              onChange={handleSelectChange}
              placeholder="Select equipment..."
              isMulti
              closeMenuOnSelect={false}
              hideSelectedOptions
              noOptionsMessage={() => (
                <span>
                  No equipment items found.{' '}
                  <CButton
                    color="primary"
                    size="sm"
                    className="p-1 m-0 align-baseline"
                    onClick={() => navigate('/catalog/create', { state: { returnTo } })}
                  >
                    Create one?
                  </CButton>
                </span>
              )}
            />
          </CCol>
        </CRow>
        <CRow>
          <CCol md={12}>
            <CFormLabel htmlFor="equipmentQuotationRemarks">
              Quotation Remarks <span className="text-muted">(optional)</span>
            </CFormLabel>
            <CFormTextarea
              id="equipmentQuotationRemarks"
              rows={3}
              maxLength={2000}
              value={quotationRemarks}
              onChange={(event) => onQuotationRemarksChange(event.target.value)}
              placeholder="General client requirements that apply to the whole quotation"
            />
            <div className="form-text">
              Use item specifications below when a requirement applies to only one item.
            </div>
          </CCol>
        </CRow>
      </CCardBody>
    </>
  )
}
