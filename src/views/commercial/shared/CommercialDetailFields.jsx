import React from 'react'
import {
  CCol,
  CFormLabel,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

export const emptyValue = '-'

export const DetailField = ({ label, value }) => (
  <CCol xs={12} md={6} lg={4}>
    <div className="records-detail-field records-detail-field--inline">
      <CFormLabel className="records-detail-label">{label}</CFormLabel>
      <div className="records-detail-value">{value || emptyValue}</div>
    </div>
  </CCol>
)

export const DetailSection = ({ title, children }) => (
  <div className="mb-4">
    <h6 className="fw-semibold mb-3">{title}</h6>
    <CRow className="g-3">{children}</CRow>
  </div>
)

export const ItemsTable = ({ items = [], columns = [], summaryRows = [] }) => (
  <div className="embedded-data-table-wrap">
    {/* datatable-exempt: existing embedded/layout table */}
    <CTable
      hover
      responsive
      className="mb-0 data-table-compact embedded-data-table"
      style={columns.length >= 5 ? { minWidth: '48rem' } : undefined}
    >
      <CTableHead>
        <CTableRow>
          <CTableHeaderCell className="text-center">#</CTableHeaderCell>
          {columns.map((column) => (
            <CTableHeaderCell key={column.key} className={column.className}>
              {column.label}
            </CTableHeaderCell>
          ))}
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {items.length ? (
          items.map((item, index) => (
            <CTableRow key={item.id || index}>
              <CTableDataCell className="text-center">{index + 1}</CTableDataCell>
              {columns.map((column) => (
                <CTableDataCell key={column.key} className={column.className}>
                  {column.render ? column.render(item) : item[column.key] || emptyValue}
                </CTableDataCell>
              ))}
            </CTableRow>
          ))
        ) : (
          <CTableRow>
            <CTableDataCell colSpan={columns.length + 1} className="text-center text-muted">
              No items.
            </CTableDataCell>
          </CTableRow>
        )}
        {summaryRows.map((row) => (
          <CTableRow key={row.key || row.label} className={row.strong ? 'fw-semibold' : undefined}>
            <CTableDataCell colSpan={columns.length} className="text-end">
              {row.label}
            </CTableDataCell>
            <CTableDataCell className="text-end">{row.value}</CTableDataCell>
          </CTableRow>
        ))}
      </CTableBody>
    </CTable>
  </div>
)
