import React, { useMemo } from 'react'
import { CBadge, CButton, CCard, CCardBody, CTable } from '@coreui/react'
import { formatContributionMoney } from '../clientFirstTouchUtils'
import { getSalespersonContributionRows } from '../salespersonContribution'

const SalespersonContributionPanel = ({ projects = [], onOpenCommercialHistory }) => {
  const rows = useMemo(() => getSalespersonContributionRows(projects), [projects])

  return (
    <CCard className="first-touch-contribution-card h-100">
      <CCardBody>
        <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-3">
          <div>
            <h2 className="h5 mb-1">Sales credited to</h2>
            <p className="text-muted mb-0">
              Sales credit follows each project or job. It is not inferred from the first-touch
              record.
            </p>
          </div>
          <CButton color="secondary" variant="outline" size="sm" onClick={onOpenCommercialHistory}>
            View commercial history
          </CButton>
        </div>

        {rows.length ? (
          <div className="table-responsive">
            <CTable className="align-middle mb-0 first-touch-sales-summary">
              <thead>
                <tr>
                  <th scope="col">Sales credited to</th>
                  <th scope="col" className="text-end text-nowrap">
                    Projects / jobs
                  </th>
                  <th scope="col" className="text-end text-nowrap">
                    Collected to date
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td>
                      <div className="fw-semibold">{row.salesOwner}</div>
                      {row.isUnassigned ? (
                        <CBadge color="warning" className="mt-1">
                          Needs assignment
                        </CBadge>
                      ) : row.salesOwnerCode ? (
                        <div className="small text-muted">{row.salesOwnerCode}</div>
                      ) : null}
                    </td>
                    <td className="text-end">{row.projectCount}</td>
                    <td className="text-end fw-semibold text-nowrap">
                      {formatContributionMoney(row.collected)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </CTable>
          </div>
        ) : (
          <p className="text-muted mb-0">
            No awarded projects or jobs are recorded for this client.
          </p>
        )}
      </CCardBody>
    </CCard>
  )
}

export default SalespersonContributionPanel
