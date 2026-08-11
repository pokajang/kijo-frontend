import { hasOpenFirstTouchConflict } from './clientFirstTouchState'

const action = (key, label, handler, options = {}) => ({
  key,
  label,
  onClick: handler,
  ...options,
})

export const getClientFirstTouchRowActions = (record, handlers) => {
  const availability = getFirstTouchActionAvailability(record, {
    ...(record?.permissions || {}),
    ...(handlers.permissions || {}),
  })

  return [
    availability.canSubmit
      ? action('submit-evidence', 'Submit Evidence', () =>
          handlers.onSubmit(record, record.firstTouch ? 'competing' : 'create'),
        )
      : null,
    availability.canEdit
      ? action('edit-evidence', 'Edit Evidence', () => handlers.onSubmit(record, 'edit'))
      : null,
    availability.canDispute
      ? action('dispute-evidence', 'Dispute Evidence', () => handlers.onDispute(record), {
          danger: true,
        })
      : null,
  ].filter(Boolean)
}

export const getFirstTouchActionAvailability = (record, permissions = {}) => {
  const hasCurrentClaim = Boolean(record?.firstTouch)
  const conflictIsOpen = hasOpenFirstTouchConflict(record)

  return {
    canSubmit: permissions.canSubmitEvidence !== false,
    canEdit: hasCurrentClaim && !conflictIsOpen && permissions.canEditEvidence !== false,
    canDispute: hasCurrentClaim && !conflictIsOpen && permissions.canDisputeEvidence !== false,
  }
}

export default getClientFirstTouchRowActions
