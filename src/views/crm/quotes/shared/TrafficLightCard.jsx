import React from 'react'

import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'

import { getTrafficLightRules } from './trafficLightConfig'

const money = (value) =>
  Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const STATUS_COLORS = {
  green: 'success',
  yellow: 'warning',
  red: 'danger',
}

const getEstimatedCost = (value) => {
  const cost = Number(value)
  return Number.isFinite(cost) && cost > 0 ? cost : null
}

const roundUpToCent = (value) => Math.ceil((value - Number.EPSILON) * 100) / 100

const getGuidanceItems = (rules, estimatedTotalCost) => {
  const cost = getEstimatedCost(estimatedTotalCost)
  const greenPrice = cost ? roundUpToCent(cost * (1 + rules.green / 100)) : null
  const yellowPrice = cost ? roundUpToCent(cost * (1 + rules.yellow / 100)) : null

  return [
    {
      status: 'green',
      label: 'Green',
      target: greenPrice ? `${money(greenPrice)}+` : '—',
    },
    {
      status: 'yellow',
      label: 'Yellow',
      target: yellowPrice && greenPrice ? `${money(yellowPrice)}–${money(greenPrice - 0.01)}` : '—',
    },
    {
      status: 'red',
      label: 'Red',
      target: yellowPrice ? `<${money(yellowPrice)}` : '—',
    },
  ]
}

const TrafficLightCard = ({
  serviceKey = 'training',
  estimatedTotalCost,
  onEstimatedTotalCostChange,
  title = 'Traffic Light',
  cardClassName = 'mb-4',
  inputPlaceholder = 'Enter estimated cost first',
}) => {
  const rules = getTrafficLightRules(serviceKey)
  const guidanceItems = getGuidanceItems(rules, estimatedTotalCost)

  return (
    <CCol xs={12}>
      <CCard className={cardClassName}>
        <CCardHeader>
          <strong>{title}</strong>
        </CCardHeader>
        <CCardBody>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <CInputGroup className="flex-nowrap" style={{ width: '12rem' }}>
              <CInputGroupText>Cost RM</CInputGroupText>
              <CFormInput
                id="estimatedTotalCost"
                aria-label="Estimated Cost (RM)"
                type="number"
                min="0"
                step="0.01"
                value={estimatedTotalCost}
                placeholder={inputPlaceholder}
                onChange={(event) =>
                  onEstimatedTotalCostChange?.(event.target.value === '' ? '' : event.target.value)
                }
              />
            </CInputGroup>

            {guidanceItems.map((item) => (
              <div
                className="border rounded px-2 py-1 d-flex align-items-center gap-1 text-nowrap"
                key={item.status}
              >
                <span
                  aria-hidden="true"
                  className={`bg-${STATUS_COLORS[item.status]} rounded-circle flex-shrink-0`}
                  style={{ width: '0.625rem', height: '0.625rem' }}
                />
                <strong>{item.label}</strong>
                <span className="small text-body-secondary">{item.target}</span>
              </div>
            ))}
          </div>
        </CCardBody>
      </CCard>
    </CCol>
  )
}

export default TrafficLightCard
