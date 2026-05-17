import React, { useEffect, useRef, useState } from 'react'
import CIcon from '@coreui/icons-react'
import { cilX } from '@coreui/icons'
import { CButton, CModal, CModalBody, CModalHeader, CModalTitle, CPopover } from '@coreui/react'

const dateFormatter = new Intl.DateTimeFormat('en-MY', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : dateFormatter.format(date)
}

const formatRm = (value) =>
  value === null || value === undefined || value === ''
    ? ''
    : `RM ${Number(value || 0).toLocaleString()}`

const getDetailsCount = (details) => Number(details?.count || 0)

const getContributorTitle = (item) =>
  item?.clientName || item?.quoteRefNo || item?.sourceId || 'Monitoring record'

const getContributorMeta = (item) =>
  [formatDate(item?.date), item?.source, item?.ownerStaffCode || item?.ownerStaffName].filter(
    Boolean,
  )

const getContributorSubject = (item) =>
  [item?.serviceType, item?.subject || item?.quoteStatus || item?.outcome]
    .filter(Boolean)
    .join(' - ')

const getContributorSourceTag = (item) =>
  String(item?.sourceType || '').trim() === 'manual' ? 'Manual Entry' : ''

const pipelineStageLabels = {
  LEADS: 'Leads',
  'lead-call': 'Leads',
  QUALIFIED: 'Qualified',
  'qualified-quote': 'Qualified',
  'MEETING/ PITCHING': 'Meeting / Pitching',
  PROPOSAL: 'Proposal',
  'proposal-quote': 'Proposal',
  NEGOTIATION: 'Negotiation',
  'awarded-quote': 'Awarded / Won',
  CLOSED: 'Closed',
  'closed-quote': 'Closed',
}

const getContributorStageLabel = (item) => {
  const eventType = String(item?.eventType || '').trim()
  return pipelineStageLabels[eventType] || ''
}

const groupContributorsByStage = (items) => {
  const groups = []

  items.forEach((item) => {
    const label = getContributorStageLabel(item)
    const key = label || 'Records'
    let group = groups.find((nextGroup) => nextGroup.key === key)

    if (!group) {
      group = { key, label: key, items: [] }
      groups.push(group)
    }

    group.items.push(item)
  })

  return groups
}

const getContributorLineParts = (item) => {
  const title = getContributorTitle(item)
  const subject = getContributorSubject(item)
  const meta = getContributorMeta(item)
  const value = formatRm(item?.value)
  const notes = item?.notes ? `Notes: ${item.notes}` : ''

  return {
    title,
    sourceTag: getContributorSourceTag(item),
    rest: [subject, value, ...meta, notes].filter(Boolean).join(' | '),
  }
}

const MonitoringContributorProofLink = ({ item, onPreview }) => {
  if (!item?.photoUrl) return null

  return (
    <>
      {' | '}
      <button
        type="button"
        className="btn btn-link btn-sm p-0 align-baseline text-decoration-none"
        onClick={() => onPreview(item)}
      >
        View proof
      </button>
    </>
  )
}

const MonitoringProofModal = ({ proof, onClose }) => (
  <CModal visible={Boolean(proof)} onClose={onClose} alignment="center" size="xl">
    <CModalHeader>
      <CModalTitle>
        {proof?.clientName || proof?.photoOriginalName || 'Screenshot Proof'}
      </CModalTitle>
    </CModalHeader>
    <CModalBody className="text-center">
      {proof?.photoUrl && (
        <img
          src={proof.photoUrl}
          alt={`Screenshot proof for ${proof?.clientName || 'monitoring record'}`}
          className="img-fluid rounded border bg-white"
          style={{ maxHeight: 'calc(100vh - 190px)', objectFit: 'contain' }}
        />
      )}
    </CModalBody>
  </CModal>
)

const MonitoringCellDetailsContent = ({ details, metricLabel, onProofPreview }) => {
  const items = Array.isArray(details?.items) ? details.items : []
  const count = getDetailsCount(details)
  const hiddenCount = Math.max(0, count - items.length)
  const stageGroups = groupContributorsByStage(items)
  const showStageGroups = stageGroups.length > 1

  return (
    <div className="monitoring-cell-details-content">
      <div className="d-flex align-items-center gap-2 mb-2">
        <span className="badge rounded-pill text-bg-light border fw-normal text-muted">
          {count.toLocaleString()} {count === 1 ? 'record' : 'records'}
        </span>
        {metricLabel && <span className="text-muted">{metricLabel}</span>}
      </div>
      <div className="d-grid gap-1">
        {(showStageGroups ? stageGroups : [{ key: 'records', label: '', items }]).map(
          (group, groupIndex) => (
            <div key={group.key} className={showStageGroups && groupIndex > 0 ? 'pt-2 mt-2' : ''}>
              {showStageGroups && (
                <div className="monitoring-cell-details-stage-row d-flex align-items-center justify-content-between gap-2 mb-1">
                  <span className="fw-semibold text-body">{group.label}</span>
                  <span className="badge rounded-pill text-bg-light border fw-normal text-muted">
                    {group.items.length.toLocaleString()}{' '}
                    {group.items.length === 1 ? 'record' : 'records'}
                  </span>
                </div>
              )}
              <div className="d-grid gap-1">
                {group.items.map((item, index) => {
                  const line = getContributorLineParts(item)

                  return (
                    <div
                      key={`${item?.eventType || 'event'}-${item?.sourceId || 'record'}-${index}`}
                      className="monitoring-cell-details-row fw-normal text-muted"
                    >
                      {index + 1}. <span className="fw-semibold text-body">{line.title}</span>
                      {line.sourceTag && (
                        <span className="badge rounded-pill text-bg-light border fw-normal text-muted ms-1">
                          {line.sourceTag}
                        </span>
                      )}
                      {line.rest ? ` | ${line.rest}` : ''}
                      <MonitoringContributorProofLink item={item} onPreview={onProofPreview} />
                    </div>
                  )
                })}
              </div>
            </div>
          ),
        )}
      </div>
      {details?.truncated && hiddenCount > 0 && (
        <div className="small text-muted mt-2">+{hiddenCount.toLocaleString()} more</div>
      )}
    </div>
  )
}

const MonitoringCellDetailsPopover = ({
  value,
  details,
  title,
  metricLabel,
  formatter = (next) => next,
  className = '',
}) => {
  const wrapperRef = useRef(null)
  const [popoverVisible, setPopoverVisible] = useState(false)
  const [proofPreview, setProofPreview] = useState(null)
  const count = getDetailsCount(details)
  const renderedValue = formatter(value)

  useEffect(() => {
    if (!popoverVisible) return undefined

    const closeOnOutsidePointer = (event) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (wrapperRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('.monitoring-cell-details-popover')) return

      setPopoverVisible(false)
    }

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setPopoverVisible(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsidePointer)
    document.addEventListener('touchstart', closeOnOutsidePointer, { passive: true })
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePointer)
      document.removeEventListener('touchstart', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [popoverVisible])

  if (count <= 0 || Number(value || 0) === 0) {
    return renderedValue
  }

  const popoverTitle = (
    <div className="d-flex align-items-center justify-content-between gap-2">
      <span>{title}</span>
      <CButton
        type="button"
        color="secondary"
        variant="ghost"
        size="sm"
        className="monitoring-cell-details-close d-inline-flex align-items-center justify-content-center p-0"
        aria-label="Close details"
        onClick={() => setPopoverVisible(false)}
      >
        <CIcon icon={cilX} size="sm" />
      </CButton>
    </div>
  )

  const previewProof = (nextProof) => {
    setProofPreview(nextProof)
    setPopoverVisible(false)
  }

  return (
    <>
      <span ref={wrapperRef}>
        <CPopover
          className="monitoring-cell-details-popover"
          trigger="click"
          placement="auto"
          title={popoverTitle}
          visible={popoverVisible}
          onShow={() => setPopoverVisible(true)}
          onHide={() => setPopoverVisible(false)}
          content={
            <MonitoringCellDetailsContent
              details={details}
              metricLabel={metricLabel}
              onProofPreview={previewProof}
            />
          }
        >
          <CButton
            type="button"
            color="link"
            size="sm"
            className={`monitoring-cell-details-trigger p-0 align-baseline ${className}`}
            aria-label={`View details for ${title || 'monitoring cell'}, ${count} ${
              count === 1 ? 'record' : 'records'
            }`}
          >
            {renderedValue}
          </CButton>
        </CPopover>
      </span>
      <MonitoringProofModal proof={proofPreview} onClose={() => setProofPreview(null)} />
    </>
  )
}

export default MonitoringCellDetailsPopover
