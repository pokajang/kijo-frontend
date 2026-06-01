import React from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CFormCheck, CTable } from '@coreui/react'
import { formatContactSummary } from '../quoteContactUtils'

const defaultSaveLabel = (isEditMode) => (isEditMode ? 'Update Quote' : 'Save Quote')

export const QuoteReviewTable = ({
  children,
  className = '',
  shellClassName = '',
  hover = true,
  responsive = true,
  bordered,
  ...tableProps
}) => (
  <div className={`data-table-embedded-shell ${shellClassName}`.trim()}>
    {/* datatable-exempt: reusable embedded quote review layout table */}
    <CTable
      hover={hover}
      responsive={responsive}
      bordered={bordered}
      className={`data-table-compact embedded-data-table ${className}`.trim()}
      {...tableProps}
    >
      {children}
    </CTable>
  </div>
)

export const QuoteReviewAttachProposal = ({
  id = 'attachProposal',
  label = 'Attach Detail Proposal',
  checked,
  onChange,
  className = 'mt-3',
}) => {
  if (typeof checked === 'undefined' || typeof onChange !== 'function') return null

  return (
    <CFormCheck
      className={className}
      id={id}
      label={label}
      checked={!!checked}
      onChange={(event) => onChange(event.target.checked)}
    />
  )
}

export const QuoteReviewActions = ({
  onCancel,
  onSave,
  isEditMode = false,
  cancelLabel = 'Cancel',
  saveLabel,
  className = 'mt-4 d-flex justify-content-end gap-2 flex-wrap',
}) => {
  if (typeof onCancel !== 'function' && typeof onSave !== 'function') return null

  return (
    <div className={className}>
      {typeof onCancel === 'function' && (
        <CButton color="secondary" variant="outline" size="sm" onClick={onCancel}>
          {cancelLabel}
        </CButton>
      )}
      {typeof onSave === 'function' && (
        <CButton color="primary" size="sm" onClick={onSave}>
          {saveLabel || defaultSaveLabel(isEditMode)}
        </CButton>
      )}
    </div>
  )
}

export const QuoteReviewSection = ({
  title = 'Review Quotation',
  children,
  attachProposal,
  attachProposalLabel = 'Attach Detail Proposal',
  onAttachProposalChange,
  onCancel,
  onSave,
  isEditMode = false,
}) => (
  <>
    <CCardHeader>
      <strong>{title}</strong>
    </CCardHeader>
    <CCardBody>
      {children}
      <QuoteReviewAttachProposal
        label={attachProposalLabel}
        checked={attachProposal}
        onChange={onAttachProposalChange}
      />
      <QuoteReviewActions onCancel={onCancel} onSave={onSave} isEditMode={isEditMode} />
    </CCardBody>
  </>
)

export const QuoteReviewCard = ({ wrapInCol = true, cardClassName = 'mb-4', ...props }) => {
  const card = (
    <CCard className={cardClassName}>
      <QuoteReviewSection {...props} />
    </CCard>
  )

  return wrapInCol ? <CCol xs={12}>{card}</CCol> : card
}

export const QuoteClientSummary = ({
  client,
  fallback = {},
  titleKey = 'company_name',
  emptyText = 'Please complete client selection',
}) => {
  const companyName = client?.[titleKey] || fallback.companyName || fallback.clientName
  const address = client?.address ?? fallback.address ?? fallback.clientAddress
  const zip = client?.zip ?? fallback.zip ?? fallback.clientZip
  const city = client?.city ?? fallback.city ?? fallback.clientCity
  const state = client?.state ?? fallback.state ?? fallback.clientState
  const contacts = formatContactSummary(client)
  const addressParts = [address, [zip, city].filter(Boolean).join(' '), state].filter(Boolean)
  const fallbackContact =
    fallback.picName || fallback.picEmail || fallback.picPhone || fallback.picPosition
      ? [
          {
            name: fallback.picName,
            email: fallback.picEmail,
            phone: fallback.picPhone,
            position: fallback.picPosition,
          },
        ]
      : []
  const displayContacts = contacts.length > 0 ? contacts : fallbackContact

  if (!companyName) return <div className="text-danger">{emptyText}</div>

  return (
    <div>
      <strong>{companyName}</strong>
      {addressParts.length > 0 && (
        <small className="text-muted"> ({addressParts.join(', ')})</small>
      )}
      {displayContacts.length > 0 && <br />}
      {displayContacts.map((pic, index) => (
        <div key={`${pic.email || 'pic'}-${pic.name || 'name'}-${index}`}>
          {pic.name || '-'} {pic.position ? `(${pic.position})` : ''}
          {(pic.email || pic.phone) && (
            <small className="text-muted">
              {' '}
              ({[pic.email, pic.phone].filter(Boolean).join(', ')})
            </small>
          )}
        </div>
      ))}
    </div>
  )
}
