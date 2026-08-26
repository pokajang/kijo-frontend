import React from 'react'
import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { formatMoney } from './salaryCalculations'

const actionLabels = {
  amend: 'Revision created',
  edit: 'Claim edited and resubmitted',
  withdraw: 'Claim withdrawn',
  archive: 'Withdrawn claim archived',
  restore_archive: 'Archived claim restored',
}

const eventDetails = (event = {}) => {
  const details = [event.reason]
  const previousTotal = Number(event.previousSnapshot?.claimsTotal)
  if (Number.isFinite(previousTotal)) details.push(`Previous total: ${formatMoney(previousTotal)}`)

  const previousClaimCount = Array.isArray(event.previousSnapshot?.claims)
    ? event.previousSnapshot.claims.length
    : 0
  if (previousClaimCount) details.push(`Previous items: ${previousClaimCount}`)

  return details.filter(Boolean).join(' / ') || '-'
}

const OtherClaimAuditTrail = ({
  events = [],
  formatDateTime,
  headingClassName = 'salary-form-panel-heading mb-3',
  id,
}) => {
  if (!events.length) return null

  return (
    <section className="mt-4" aria-labelledby={id}>
      <h3 className={headingClassName} id={id}>
        Record audit
      </h3>
      <CTable responsive small>
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell scope="col">Action</CTableHeaderCell>
            <CTableHeaderCell scope="col">By</CTableHeaderCell>
            <CTableHeaderCell scope="col">When</CTableHeaderCell>
            <CTableHeaderCell scope="col">Details</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {events.map((event) => (
            <CTableRow key={event.id}>
              <CTableDataCell>{actionLabels[event.action] || event.action || '-'}</CTableDataCell>
              <CTableDataCell>{event.actorName || event.actorCode || '-'}</CTableDataCell>
              <CTableDataCell>{formatDateTime(event.actedAt)}</CTableDataCell>
              <CTableDataCell>{eventDetails(event)}</CTableDataCell>
            </CTableRow>
          ))}
        </CTableBody>
      </CTable>
    </section>
  )
}

export default OtherClaimAuditTrail
