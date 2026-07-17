import React from 'react'

import { CBadge, CCard, CCardBody, CCardHeader, CCol, CFormInput, CFormLabel } from '@coreui/react'

import { getTrafficLightStatus } from './trafficLightConfig'

const money = (value) =>
  Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const asPercent = (value) => (Number.isFinite(value) ? `${value.toFixed(2)}%` : '--')

const getStatusLabel = (status) =>
  status === 'green'
    ? 'Green'
    : status === 'yellow'
      ? 'Yellow'
      : status === 'red'
        ? 'Red'
        : 'Pending'

const getStatusBadgeColor = (status) =>
  status === 'green'
    ? 'success'
    : status === 'yellow'
      ? 'warning'
      : status === 'red'
        ? 'danger'
        : 'secondary'

const getGuidanceItems = (rules) => [
  {
    status: 'green',
    label: 'Green',
    range: `≥ ${rules.green}%`,
    guidance: 'No approval',
  },
  {
    status: 'yellow',
    label: 'Yellow',
    range: `≥ ${rules.yellow}% and < ${rules.green}%`,
    guidance: 'Approval review',
  },
  {
    status: 'red',
    label: 'Red',
    range: `< ${rules.yellow}%`,
    guidance: 'Approval review',
  },
]

const TrafficLightCard = ({
  serviceKey = 'training',
  quoteTotal,
  estimatedTotalCost,
  trafficLightRuleVersion,
  onEstimatedTotalCostChange,
  title = 'Traffic Light',
  cardClassName = 'mb-4',
  inputPlaceholder = 'Enter estimated cost first',
}) => {
  const { status, marginPercent, rules, hasEstimate } = getTrafficLightStatus({
    serviceKey,
    quoteTotal,
    estimatedTotalCost,
  })
  const guidanceItems = getGuidanceItems(rules)

  return (
    <CCol xs={12}>
      <CCard className={cardClassName}>
        <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
          <strong>{title}</strong>
          <small className="text-body-secondary">
            Advisory only ({trafficLightRuleVersion || 'v1'}) — saving and submission remain
            available.
          </small>
        </CCardHeader>
        <CCardBody>
          <div className="row g-3 align-items-end">
            <CCol md={5}>
              <CFormLabel htmlFor="estimatedTotalCost">Estimated Cost (RM)</CFormLabel>
              <CFormInput
                id="estimatedTotalCost"
                type="number"
                min="0"
                step="0.01"
                value={estimatedTotalCost}
                placeholder={inputPlaceholder}
                onChange={(event) =>
                  onEstimatedTotalCostChange?.(event.target.value === '' ? '' : event.target.value)
                }
              />
            </CCol>

            <CCol md={7}>
              <div className="d-flex flex-wrap gap-4">
                <div>
                  <div className="small text-body-secondary">Quote total</div>
                  <div className="fw-semibold">RM {money(quoteTotal || 0)}</div>
                </div>
                <div>
                  <div className="small text-body-secondary">Current margin</div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-semibold">{asPercent(marginPercent)}</span>
                    <CBadge color={getStatusBadgeColor(status)}>{getStatusLabel(status)}</CBadge>
                  </div>
                </div>
              </div>
            </CCol>

            <CCol xs={12}>
              <div className="row g-2">
                {guidanceItems.map((item) => {
                  const isActive = hasEstimate && status === item.status
                  return (
                    <CCol xs={12} sm={4} key={item.status}>
                      <div
                        className={`border rounded p-2 h-100 ${
                          isActive ? `border-${getStatusBadgeColor(item.status)} border-2` : ''
                        }`}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={`bg-${getStatusBadgeColor(item.status)} rounded-circle flex-shrink-0`}
                            style={{ width: '0.75rem', height: '0.75rem' }}
                          />
                          <strong>{item.label}</strong>
                        </div>
                        <div className="small text-body-secondary mt-1">{item.range}</div>
                        <div className="small text-body-secondary">{item.guidance}</div>
                      </div>
                    </CCol>
                  )
                })}
              </div>
            </CCol>
          </div>
        </CCardBody>
      </CCard>
    </CCol>
  )
}

export default TrafficLightCard
