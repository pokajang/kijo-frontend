import React, { useMemo, useState } from 'react'
import {
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CTooltip,
} from '@coreui/react'

const DEFAULT_MAX_WIDTH = '200px'
const DEFAULT_THRESHOLD = 34

const isMultiLineText = (value) => String(value || '').includes('\n')

const DataTableTextCell = ({
  value,
  emptyText = '-',
  maxWidth = DEFAULT_MAX_WIDTH,
  title = 'Details',
  mode = 'expandable',
  previewCharThreshold = DEFAULT_THRESHOLD,
  truncateCharThreshold,
  className = '',
  constrain = false,
}) => {
  const [showModal, setShowModal] = useState(false)
  const text = String(value ?? '').trim()
  const usesTooltip = mode === 'tooltip'
  const shouldConstrain = constrain || mode === 'expandable' || usesTooltip
  const effectiveCharThreshold =
    truncateCharThreshold ??
    (mode === 'expandable' || usesTooltip ? previewCharThreshold : undefined)
  const charLimit = Number.isFinite(Number(effectiveCharThreshold))
    ? Math.max(0, Math.floor(Number(effectiveCharThreshold)))
    : null
  const isCharTruncated = Boolean(charLimit && text.length > charLimit)
  const previewText = isCharTruncated ? `${text.slice(0, charLimit).trimEnd()}...` : text
  const displayText = previewText || emptyText
  const fullText = text || emptyText
  const expandable = shouldConstrain && mode === 'expandable'
  const shouldShowMore =
    expandable &&
    text &&
    (isCharTruncated || text.length > previewCharThreshold || isMultiLineText(text))
  const shouldShowTooltip =
    usesTooltip &&
    text &&
    (isCharTruncated || text.length > previewCharThreshold || isMultiLineText(text))

  const textNode = useMemo(
    () => (
      <span
        className={`${text ? 'text-body' : 'text-muted'} ${className}`.trim()}
        title={shouldShowTooltip ? fullText : undefined}
        style={{
          whiteSpace: 'nowrap',
          ...(shouldConstrain
            ? {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'block',
                maxWidth,
                width: '100%',
                minWidth: 0,
              }
            : {}),
        }}
      >
        {text ? displayText : <em>{displayText}</em>}
      </span>
    ),
    [className, displayText, fullText, maxWidth, shouldConstrain, shouldShowTooltip, text],
  )

  if (shouldShowTooltip) {
    return (
      <CTooltip content={fullText} placement="top">
        {textNode}
      </CTooltip>
    )
  }

  if (!shouldShowMore) return textNode

  const openModal = (event) => {
    event.stopPropagation()
    setShowModal(true)
  }

  const closeModal = (event) => {
    event?.stopPropagation?.()
    setShowModal(false)
  }

  return (
    <>
      <div className="d-flex align-items-center gap-1 min-w-0">
        {textNode}
        <CButton
          color="light"
          size="sm"
          className="data-table-remarks-more records-remarks-more records-remarks-more--compact flex-shrink-0"
          data-no-row-open="true"
          onClick={openModal}
          onMouseDown={(event) => event.stopPropagation()}
        >
          More
        </CButton>
      </div>

      <CModal visible={showModal} onClose={closeModal} alignment="center">
        <CModalHeader closeButton>
          <CModalTitle>{title}</CModalTitle>
        </CModalHeader>
        <CModalBody onClick={(event) => event.stopPropagation()}>
          <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
            {fullText}
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={closeModal}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default DataTableTextCell
