import React, { useMemo, useState } from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'

const MAX_PREVIEW_CHARS = 34

const truncateText = (text = '', maxChars = MAX_PREVIEW_CHARS) => {
  const raw = String(text || '').trim()
  if (raw.length <= maxChars) return raw
  return `${raw.slice(0, maxChars).trim()}...`
}

const buildRemarkEntries = (record, fmtDate) => {
  const primary = String(record?.statusRemarks || '').trim()
  const primaryLower = primary.toLowerCase()
  const hasPrimary = primary.length > 0 && primaryLower !== 'pending'
  const followUps = Array.isArray(record?.followUps) ? record.followUps : []
  const awardHistory = Array.isArray(record?.awardHistory) ? record.awardHistory : []

  const awardEvents = awardHistory.map((ev, idx) => ({
    id: ev?.id ?? `${record?.id || 'row'}-award-${idx}`,
    text: `${ev?.awardDate || fmtDate(ev?.createdAt) || '-'} ${idx === 0 ? 'Awarded' : 'Re-Awarded'}`,
    className: 'text-success',
  }))

  const shouldRenderPrimary =
    hasPrimary &&
    (awardEvents.length === 0 || (!primaryLower.includes('re-award') && primaryLower !== 'awarded'))

  const entries = [...awardEvents]
  if (shouldRenderPrimary) {
    const statusL = String(record?.status || '').toLowerCase()
    const className =
      statusL === 'failed' ? 'text-danger' : statusL === 'awarded' ? 'text-success' : 'text-body'
    const primaryDate = fmtDate(record?.dateUpdated || record?.dateCreated) || '-'
    entries.push({
      id: `${record?.id || 'row'}-primary`,
      text: `${primaryDate} ${primary}`.trim(),
      className,
    })
  }

  followUps.forEach((fu, idx) => {
    entries.push({
      id: fu?.id ?? `${record?.id || 'row'}-followup-${idx}`,
      text: `${fu?.followUpDate || '-'} ${String(fu?.remarks || '').trim()}`.trim(),
      className: 'text-muted',
    })
  })

  if (entries.length === 0) {
    entries.push({
      id: `${record?.id || 'row'}-pending`,
      text: 'Pending',
      className: 'text-muted',
      italic: true,
    })
  }

  return entries
}

const RemarksCell = ({ record, fmtDate, compact = false }) => {
  const [showModal, setShowModal] = useState(false)
  const entries = useMemo(() => buildRemarkEntries(record, fmtDate), [record, fmtDate])

  const preview = entries[0]
  const shouldShowSeeMore =
    entries.length > 1 || String(preview?.text || '').length > MAX_PREVIEW_CHARS

  return (
    <>
      <div className={compact ? 'd-flex align-items-center gap-1' : 'd-flex flex-column gap-1'}>
        <small
          className={preview?.className || 'text-muted'}
          style={
            compact
              ? {
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                }
              : undefined
          }
        >
          {preview?.italic ? <em>{truncateText(preview?.text)}</em> : truncateText(preview?.text)}
        </small>
        {shouldShowSeeMore && (
          <CButton
            color="light"
            size="sm"
            className={
              compact
                ? 'records-remarks-more records-remarks-more--compact flex-shrink-0'
                : 'records-remarks-more align-self-start'
            }
            onClick={() => setShowModal(true)}
          >
            {compact ? 'More' : 'See more'}
          </CButton>
        )}
      </div>

      <CModal visible={showModal} onClose={() => setShowModal(false)} alignment="center">
        <CModalHeader closeButton>
          <CModalTitle>Remarks</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <ul className="list-unstyled mb-0">
            {entries.map((entry) => (
              <li key={entry.id} className="mb-2">
                <span className={entry.className || 'text-muted'}>
                  {entry.italic ? <em>{entry.text}</em> : entry.text}
                </span>
              </li>
            ))}
          </ul>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setShowModal(false)}
          >
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default RemarksCell
