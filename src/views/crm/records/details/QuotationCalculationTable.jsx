import React from 'react'
import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { formatMoney } from './quotationDetailUtils'

const QuotationCalculationTable = ({ rows, caption }) => (
  <div className="quotation-calculation-table-wrap">
    <CTable className="align-middle mb-0 quotation-calculation-table">
      <caption className="visually-hidden">{caption}</caption>
      <CTableHead>
        <CTableRow>
          <CTableHeaderCell scope="col" className="quotation-calculation-label">
            Description
          </CTableHeaderCell>
          <CTableHeaderCell scope="col" className="quotation-calculation-formula">
            Calculation
          </CTableHeaderCell>
          <CTableHeaderCell scope="col" className="text-end quotation-calculation-amount">
            Amount
          </CTableHeaderCell>
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {rows.map((row) => (
          <CTableRow
            key={row.key}
            className={row.emphasis ? `quotation-calculation-row--${row.emphasis}` : undefined}
          >
            <CTableHeaderCell scope="row" className="quotation-calculation-label">
              <div>{row.label}</div>
              {row.description ? (
                <div className="small fw-normal text-body-secondary mt-1">{row.description}</div>
              ) : null}
            </CTableHeaderCell>
            <CTableDataCell className="text-body-secondary quotation-calculation-formula">
              {row.calculation || null}
            </CTableDataCell>
            <CTableDataCell
              className={`text-end quotation-calculation-amount ${
                row.negative ? 'text-danger' : ''
              }`.trim()}
            >
              {row.negative ? `− ${formatMoney(row.amount)}` : formatMoney(row.amount)}
            </CTableDataCell>
          </CTableRow>
        ))}
      </CTableBody>
    </CTable>
  </div>
)

export default QuotationCalculationTable
