import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilInfo } from '@coreui/icons'
import { formatCompactContributionMoney, formatFirstTouchDate } from '../clientFirstTouchUtils'

const ClientContributionPanel = ({ contribution }) => {
  const metrics = [
    { key: 'collected', label: 'Collected sales', value: contribution?.collected },
    { key: 'awarded', label: 'Awarded value', value: contribution?.awarded },
    { key: 'invoiced', label: 'Invoiced', value: contribution?.invoiced },
    { key: 'grossProfit', label: 'Gross profit', value: contribution?.grossProfit },
  ]

  return (
    <CCard className="h-100 first-touch-contribution-card">
      <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
        <strong>Client contribution to date</strong>
        <span className="small text-muted">
          All time · As of {formatFirstTouchDate(contribution?.asOf)}
        </span>
      </CCardHeader>
      <CCardBody>
        <div className="first-touch-metrics" aria-label="All-time client contribution">
          {metrics.map((metric) => (
            <div className="first-touch-metric" key={metric.key}>
              <div className="first-touch-metric__value">
                {formatCompactContributionMoney(metric.value)}
              </div>
              <div className="first-touch-metric__label">{metric.label}</div>
            </div>
          ))}
        </div>
        <div className="first-touch-attribution-note" role="note">
          <CIcon icon={cilInfo} size="lg" aria-hidden="true" />
          <div>
            <div className="fw-semibold">Commercial contribution shown for context</div>
            <div>
              Sales credit belongs to the salesperson assigned to each project or job—not the
              first-touch source, evidence submitter, or verifier.
            </div>
          </div>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default ClientContributionPanel
