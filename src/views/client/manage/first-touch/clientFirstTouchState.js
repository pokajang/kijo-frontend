export const CURRENT_FIRST_TOUCH_USER = 'Current user'

const createConflict = (record, additions = {}) => {
  const activeConflict = ['open', 'clarification_requested'].includes(record.conflict?.status)
    ? record.conflict
    : null

  return {
    id: activeConflict?.id || `conflict-${record.companyId}-${Date.now()}`,
    status: 'open',
    openedAt: activeConflict?.openedAt || new Date().toISOString(),
    currentClaimId: record.firstTouch?.id,
    competingClaimIds: activeConflict?.competingClaimIds || [],
    disputeIds: activeConflict?.disputeIds || [],
    ...additions,
  }
}

export const hasOpenFirstTouchConflict = (record) =>
  ['open', 'clarification_requested'].includes(record?.conflict?.status)

export const getFirstTouchClaims = (record) => {
  if (record?.claims?.length) return record.claims
  return record?.firstTouch ? [record.firstTouch] : []
}

export const submitFirstTouchEvidence = (record, claim) => {
  const claims = getFirstTouchClaims(record)

  if (!record.firstTouch) {
    const currentClaim = { ...claim, status: 'current' }
    return { ...record, firstTouch: currentClaim, claims: [...claims, currentClaim] }
  }

  const competingClaim = { ...claim, status: 'competing' }
  const currentClaim = { ...record.firstTouch, status: 'contested' }
  const existingCompetingClaimIds = hasOpenFirstTouchConflict(record)
    ? record.conflict.competingClaimIds || []
    : []
  const conflict = createConflict(record, {
    competingClaimIds: [...new Set([...existingCompetingClaimIds, competingClaim.id])],
  })

  return {
    ...record,
    firstTouch: currentClaim,
    claims: claims
      .map((item) => (item.id === currentClaim.id ? currentClaim : item))
      .concat(competingClaim),
    conflict,
  }
}

export const editCurrentFirstTouchEvidence = (record, claim) => {
  const previousClaim = record.firstTouch
  const { revisions: previousRevisions = [], ...previousSnapshot } = previousClaim
  const { editReason, ...claimDetails } = claim
  const revision = {
    revisedAt: new Date().toISOString(),
    revisedBy: CURRENT_FIRST_TOUCH_USER,
    reason: editReason,
    previous: previousSnapshot,
  }
  const currentClaim = {
    ...claimDetails,
    id: previousClaim.id,
    status: 'current',
    submittedBy: previousClaim.submittedBy,
    submittedAt: previousClaim.submittedAt,
    revisions: [...previousRevisions, revision],
    updatedBy: CURRENT_FIRST_TOUCH_USER,
    updatedAt: revision.revisedAt,
    lastEditReason: editReason,
  }

  return {
    ...record,
    firstTouch: currentClaim,
    claims: getFirstTouchClaims(record).map((item) =>
      item.id === currentClaim.id ? currentClaim : item,
    ),
  }
}

export const disputeCurrentFirstTouchEvidence = (record, dispute) => {
  const currentClaim = { ...record.firstTouch, status: 'contested' }
  const disputes = [...(record.disputes || []), dispute]
  const existingDisputeIds = hasOpenFirstTouchConflict(record)
    ? record.conflict.disputeIds || []
    : []
  return {
    ...record,
    firstTouch: currentClaim,
    claims: getFirstTouchClaims(record).map((item) =>
      item.id === currentClaim.id ? currentClaim : item,
    ),
    disputes,
    conflict: createConflict(record, {
      disputeIds: [...new Set([...existingDisputeIds, dispute.id])],
    }),
  }
}

export const resolveFirstTouchConflict = (
  record,
  decision,
  note,
  selectedClaimId,
  metadata = {},
) => {
  const resolvedAt = new Date().toISOString()
  const claims = getFirstTouchClaims(record)
  const activeClaimIds = new Set([
    record.conflict?.currentClaimId,
    ...(record.conflict?.competingClaimIds || []),
  ])
  const competingClaim = claims.find((claim) => claim.id === selectedClaimId)

  if (decision === 'clarification_requested') {
    return {
      ...record,
      conflict: {
        ...record.conflict,
        status: 'clarification_requested',
        resolution: decision,
        comment: note,
        clarificationRecipient: metadata.clarificationRecipient || null,
        reviewedBy: 'Current reviewer',
        reviewedAt: resolvedAt,
      },
    }
  }

  let firstTouch = { ...record.firstTouch, status: 'current' }
  let nextClaims = claims.map((claim) =>
    claim.id === firstTouch.id
      ? firstTouch
      : activeClaimIds.has(claim.id)
        ? { ...claim, status: 'rejected' }
        : claim,
  )

  if (decision === 'accept_competing' && competingClaim) {
    firstTouch = { ...competingClaim, status: 'current' }
    nextClaims = claims.map((claim) =>
      activeClaimIds.has(claim.id)
        ? { ...claim, status: claim.id === competingClaim.id ? 'current' : 'superseded' }
        : claim,
    )
  }

  if (decision === 'reject_both') {
    firstTouch = null
    nextClaims = claims.map((claim) =>
      activeClaimIds.has(claim.id) ? { ...claim, status: 'rejected' } : claim,
    )
  }

  const resolvedDisputes = (record.disputes || []).map((dispute) =>
    record.conflict?.disputeIds?.includes(dispute.id)
      ? {
          ...dispute,
          status: decision === 'uphold_current' ? 'dismissed' : 'resolved',
          resolution: decision,
          resolvedAt,
        }
      : dispute,
  )

  return {
    ...record,
    firstTouch,
    claims: nextClaims,
    disputes: resolvedDisputes,
    conflict: {
      ...record.conflict,
      status: 'resolved',
      resolution: decision,
      comment: note,
      resolvedBy: 'Current reviewer',
      resolvedAt,
    },
  }
}
