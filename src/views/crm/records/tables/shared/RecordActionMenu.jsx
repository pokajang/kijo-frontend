import React from 'react'
import { DataTableActionMenu } from '../../../../../components/datatable'
import { useAuth } from '../../../../../auth/AuthProvider'
import { getRecordEmailAddress } from '../../utils/recordEmail'
import { getQuoteDeleteRestriction, isQuoteOwnedByUser } from '../../utils/recordOwnership'
import { getQuoteIssuanceState } from '../../utils/recordApproval'
import { canRecordTabRequestNegotiation } from '../../config/recordTabs'

const canRequestNegotiation = (record, user) => {
  if (!canRecordTabRequestNegotiation(record?.serviceTab)) return false
  const status = String(record?.status || '')
    .trim()
    .toLowerCase()
  if (!['open', 'pending'].includes(status)) return false
  if (Number(record?.priceExceptionRequestId || record?.price_exception_request_id || 0) > 0) {
    return false
  }
  if (Number(record?.activeNegotiationRequestCount || 0) > 0) return false

  return isQuoteOwnedByUser(record, user)
}

const RecordActionMenu = ({
  record,
  onGenerate,
  onFollowUp,
  onChangeToFail,
  onChangeToSuccess,
  onUnAward,
  onReAward,
  onEdit,
  onRevise,
  onNegotiate,
  onView,
  onSyncClient,
  onDelete,
  onOpenTab,
  onEmail,
  onSharePdf,
  popperConfig,
  actionKey,
  openActionKey,
  setOpenActionKey,
}) => {
  const { user } = useAuth()
  const isAwarded = record?.status === 'Awarded'
  const hasEmail = Boolean(getRecordEmailAddress(record))
  const negotiationAllowed = canRequestNegotiation(record, user)
  const deleteRestriction = onDelete ? getQuoteDeleteRestriction(record, user) : ''
  const approval = record?.approval
  const issuanceState = getQuoteIssuanceState(record)
  const issuanceBlocked = issuanceState.blocked
  const approvalMessage = issuanceState.message || undefined

  const actions = [
    { key: 'view', label: 'View', onClick: onView, hidden: !onView },
    { key: 'open-tab', label: 'Open Tab', onClick: onOpenTab, hidden: !onOpenTab },
    {
      key: 'review-approval',
      label: 'Review Approval',
      onClick: () =>
        window.dispatchEvent(new CustomEvent('quote-approval:review', { detail: approval })),
      hidden: !approval?.can_decide || approval?.status !== 'pending',
    },
    {
      key: 'email',
      label: 'Email',
      onClick: onEmail,
      hidden: !onEmail || !hasEmail,
      disabled: issuanceBlocked,
      tooltip: approvalMessage,
    },
    {
      key: 'share-pdf',
      label: 'Share PDF',
      onClick: onSharePdf,
      hidden: !onSharePdf,
      disabled: issuanceBlocked,
      tooltip: approvalMessage,
    },
    { key: 'edit', label: 'Edit', onClick: onEdit, hidden: !onEdit },
    { key: 'revise', label: 'Revise', onClick: onRevise, hidden: !onRevise },
    {
      key: 'negotiate',
      label: 'Negotiate',
      onClick: onNegotiate,
      hidden: !onNegotiate || !negotiationAllowed,
    },
    {
      key: 'generate',
      label: 'Generate Quote',
      onClick: onGenerate,
      hidden: !onGenerate,
      disabled: issuanceBlocked,
      tooltip: approvalMessage,
    },
    { key: 'follow-up', label: 'Follow Up', onClick: onFollowUp, hidden: !onFollowUp },
    {
      key: 'un-award',
      label: 'Un-Award',
      onClick: onUnAward,
      hidden: !isAwarded || !onUnAward,
    },
    {
      key: 're-award',
      label: 'Re-Award',
      onClick: onReAward,
      hidden: !isAwarded || !onReAward,
      disabled: issuanceBlocked,
      tooltip: approvalMessage,
    },
    {
      key: 'awarded',
      label: 'Awarded',
      onClick: onChangeToSuccess,
      hidden: isAwarded || !onChangeToSuccess,
      disabled: issuanceBlocked,
      tooltip: approvalMessage,
    },
    { key: 'failed', label: 'Failed', onClick: onChangeToFail, hidden: !onChangeToFail },
    {
      key: 'sync-client',
      label: 'Sync Client',
      onClick: onSyncClient,
      hidden: !onSyncClient,
      tooltip: 'Use after updating client info. Awarded quotes can sync related docs.',
    },
    {
      key: 'delete',
      label: 'Delete',
      onClick: onDelete,
      hidden: !onDelete,
      disabled: Boolean(deleteRestriction),
      tooltip: deleteRestriction || undefined,
      danger: true,
      dividerBefore: true,
    },
  ]

  return (
    <DataTableActionMenu
      record={record}
      actions={actions}
      popperConfig={popperConfig}
      actionKey={actionKey}
      openActionKey={openActionKey}
      setOpenActionKey={setOpenActionKey}
    />
  )
}

export default RecordActionMenu
