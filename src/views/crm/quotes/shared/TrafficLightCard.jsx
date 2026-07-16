import React from 'react'

import {
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CAlert,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
} from '@coreui/react'

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

  return (
    <CCol xs={12}>
      <CCard className={cardClassName}>
        <CCardHeader>
          <strong>{title}</strong>
        </CCardHeader>
        <CCardBody>
          <CAlert color="info" className="mb-3">
            <strong>Advisory only (V1):</strong> this traffic light is for guidance only and does
            not enforce or block quotation approval workflow at this time.
          </CAlert>
          <CForm className="row g-3">
            <CCol md={6}>
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
              <small className="text-body-secondary d-block mt-1">
                Green / Yellow / Red are based on margin against this estimate.
              </small>
              <small className="text-body-secondary d-block mt-1">
                This status is guidance based on margin.
              </small>
            </CCol>

            <CCol md={6}>
              <p className="mb-2">
                Current Quote Total: <strong>RM {money(quoteTotal || 0)}</strong>
              </p>
              <p className="mb-2">
                Rule Version: <strong>{trafficLightRuleVersion || 'v1'}</strong>
              </p>
              <p className="mb-1">
                Guidance: <strong>Green</strong> {'>='} {rules.green}%, <strong>Yellow</strong>
                {' >='} {rules.yellow}%, <strong>Red</strong> {'<'} {rules.red}%
              </p>
              <div className="d-flex gap-2 flex-wrap align-items-center">
                <CBadge color={getStatusBadgeColor(status)}>{getStatusLabel(status)}</CBadge>
                <span className="text-body-secondary">
                  Current Margin: {asPercent(marginPercent)}
                </span>
              </div>
              {!hasEstimate ? (
                <small className="text-body-secondary d-block mt-2">
                  Enter an estimated cost to display the live traffic light status.
                </small>
              ) : (
                <small className="text-body-secondary d-block mt-2">
                  Estimated: RM {money(estimatedTotalCost)} | Margin calc =
                  {Number.isFinite(quoteTotal) && Number(estimatedTotalCost) > 0
                    ? ` (${money(quoteTotal)} - ${money(estimatedTotalCost)}) / ${money(estimatedTotalCost)} * 100`
                    : ''}
                </small>
              )}

              <small className="text-body-secondary d-block mt-2">
                Non-enforcing: this guidance does not automatically prevent saving or submission.
              </small>
            </CCol>
          </CForm>
        </CCardBody>
      </CCard>
    </CCol>
  )
}

export default TrafficLightCard
