import React, { useMemo, useState } from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'

const MAX_PREVIEW_CHARS = 34

const truncateText = (text = '', maxChars = MAX_PREVIEW_CHARS) => {
  const raw = String(text || '').trim()
  if (raw.length <= maxChars) return raw
  return `${raw.slice(0, maxChars).trim()}...`
}

const normalizeEntries = (entries, value) => {
  if (Array.isArray(entries) && entries.length > 0) return entries
  const text = String(value || '').trim()
  if (text) return [{ id: 'remark', text, className: 'text-body' }]
  return [{ id: 'empty', text: 'Pending', className: 'text-muted', italic: true }]
}

const RemarksCell = ({ entries, value, compact = false, title = 'Remarks' }) => {
  const [showModal, setShowModal] = useState(false)
  const normalizedEntries = useMemo(() => normalizeEntries(entries, value), [entries, value])
  const preview = normalizedEntries[0]
  const shouldShowSeeMore =
    normalizedEntries.length > 1 || String(preview?.text || '').length > MAX_PREVIEW_CHARS

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
                ? 'data-table-remarks-more records-remarks-more records-remarks-more--compact flex-shrink-0'
                : 'data-table-remarks-more records-remarks-more align-self-start'
            }
            onClick={() => setShowModal(true)}
          >
            {compact ? 'More' : 'See more'}
          </CButton>
        )}
      </div>

      <CModal visible={showModal} onClose={() => setShowModal(false)} alignment="center">
        <CModalHeader closeButton>
          <CModalTitle>{title}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <ul className="list-unstyled mb-0">
            {normalizedEntries.map((entry) => (
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
