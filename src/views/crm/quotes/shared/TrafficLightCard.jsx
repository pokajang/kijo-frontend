import React from 'react'

import {
  CAlert,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'

import './TrafficLightCard.css'
import { getTrafficLightRules, normalizeTrafficLightAmount } from './trafficLightConfig'

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

const roundUpToCent = (value) => Math.ceil(Number(value.toFixed(10)) * 100) / 100

const getGuidanceItems = (rules, estimatedTotalCost) => {
  const cost = normalizeTrafficLightAmount(estimatedTotalCost)
  const greenPrice = cost ? roundUpToCent(cost * (1 + rules.green / 100)) : null
  const yellowPrice = cost ? roundUpToCent(cost * (1 + rules.yellow / 100)) : null

  return [
    {
      status: 'green',
      label: 'Green',
      guidance: greenPrice
        ? `Quote at least RM ${money(greenPrice)}`
        : 'Enter cost to calculate the minimum quote',
      target: greenPrice ? `${money(greenPrice)}+` : '—',
    },
    {
      status: 'yellow',
      label: 'Yellow',
      guidance:
        yellowPrice && greenPrice
          ? `Quote from RM ${money(yellowPrice)} to RM ${money(greenPrice - 0.01)}`
          : 'Enter cost to calculate the quote range',
      target: yellowPrice && greenPrice ? `${money(yellowPrice)}–${money(greenPrice - 0.01)}` : '—',
    },
    {
      status: 'red',
      label: 'Red',
      guidance: yellowPrice
        ? `Quote below RM ${money(yellowPrice)}`
        : 'Enter cost to calculate the maximum quote',
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
          <CAlert color="info" dismissible className="traffic-light-procedure-alert mb-2 py-2">
            This is a traffic light guiding procedure. Please input estimated cost and ensure your
            quoted price always stays in the Green zone.
          </CAlert>
          <div className="traffic-light-guidance-row">
            <CInputGroup className="traffic-light-cost-input flex-nowrap">
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

            <div className="traffic-light-guidance-bands">
              {guidanceItems.map((item) => (
                <div className="traffic-light-guidance-band" key={item.status}>
                  <span
                    aria-hidden="true"
                    className={`bg-${STATUS_COLORS[item.status]} rounded-circle flex-shrink-0`}
                    style={{ width: '0.625rem', height: '0.625rem' }}
                  />
                  <strong>{item.label}</strong>
                  <span className="small text-body-secondary">{item.guidance}</span>
                </div>
              ))}
            </div>
          </div>
        </CCardBody>
      </CCard>
    </CCol>
  )
}

export default TrafficLightCard
