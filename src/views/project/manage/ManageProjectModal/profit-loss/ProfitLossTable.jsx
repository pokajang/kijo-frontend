import React from 'react'
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'
import { toFiniteNumber } from '../../projectApi'

const ProfitLossTable = ({
  revenue,
  totalApproved,
  totalPending,
  totalManualExpenses,
  confirmedNetProfit,
  projectedNetProfit,
  projectExpenses = [],
  onViewReceipt,
  onDeleteExpense,
  deletingExpenseId,
}) => (
  <div className="data-table-embedded-shell">
    {/* datatable-exempt: existing embedded/layout table */}
    <CTable hover className="data-table-compact embedded-data-table">
      <CTableHead>
        <CTableRow>
          <CTableHeaderCell>Description</CTableHeaderCell>
          <CTableHeaderCell className="text-end">Amount (RM)</CTableHeaderCell>
        </CTableRow>
      </CTableHead>
      <CTableBody>
        <CTableRow>
          <CTableDataCell>
            <strong>Project Revenue</strong>
          </CTableDataCell>
          <CTableDataCell className="text-end">{revenue.toLocaleString()}</CTableDataCell>
        </CTableRow>

        <CTableRow>
          <CTableDataCell>&emsp;Approved Vendor Cost</CTableDataCell>
          <CTableDataCell className="text-end">{totalApproved.toLocaleString()}</CTableDataCell>
        </CTableRow>

        <CTableRow>
          <CTableDataCell>&emsp;Pending Payments</CTableDataCell>
          <CTableDataCell className="text-end">{totalPending.toLocaleString()}</CTableDataCell>
        </CTableRow>

        <CTableRow>
          <CTableDataCell>&emsp;Other Project Expenses</CTableDataCell>
          <CTableDataCell className="text-end">
            {totalManualExpenses.toLocaleString()}
          </CTableDataCell>
        </CTableRow>

        {projectExpenses.map((exp, index) => (
          <CTableRow key={exp.id || index}>
            <CTableDataCell>
              &emsp;&emsp;{exp.date} - {exp.remarks || 'No remarks'}{' '}
              <small className="text-muted">
                <em>(By {exp.created_by_name_code})</em>
              </small>
              {exp.file_path && (
                <>
                  {' | '}
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0"
                    onClick={() => onViewReceipt(exp.file_path)}
                  >
                    View Receipt
                  </button>
                </>
              )}
              {' | '}
              <button
                type="button"
                className="btn btn-link btn-sm text-danger p-0"
                disabled={deletingExpenseId != null}
                onClick={() => onDeleteExpense(exp.id)}
              >
                {deletingExpenseId === exp.id ? 'Deleting...' : 'Delete'}
              </button>
            </CTableDataCell>
            <CTableDataCell className="text-end">
              {toFiniteNumber(exp.amount).toLocaleString()}
            </CTableDataCell>
          </CTableRow>
        ))}

        <CTableRow className="project-profit-loss-summary-row fw-bold">
          <CTableDataCell>Net Profit (Confirmed)</CTableDataCell>
          <CTableDataCell className="text-end">
            {confirmedNetProfit.toLocaleString()}
          </CTableDataCell>
        </CTableRow>

        <CTableRow className="project-profit-loss-summary-row fw-bold">
          <CTableDataCell>Net Profit (If All Pending Approved)</CTableDataCell>
          <CTableDataCell className="text-end">
            {projectedNetProfit.toLocaleString()}
          </CTableDataCell>
        </CTableRow>
      </CTableBody>
    </CTable>
  </div>
)

export default ProfitLossTable
