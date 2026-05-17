import { MEETING_TYPE_OPTIONS } from './meetingConstants'
import { createEmptyActionItem, normalizeActionStatus } from './meetingActionItems'
import { toDateOnlyValue, toDateTimeLocalValue } from './meetingDateUtils'

export const createInitialForm = () => ({
  meetingTitle: '',
  meetingType: 'Ad Hoc',
  meetingDateTime: '',
  venue: '',
  guestAttendeesText: '',
  agenda: '',
  minutesText: '',
  actionItems: [],
  attendeeIds: [],
})

export const normalizeDraftForm = (value) => {
  const source = value && typeof value === 'object' ? value : {}
  const base = createInitialForm()
  const rawActionItems = Array.isArray(source.actionItems) ? source.actionItems : []

  return {
    ...base,
    meetingTitle: String(source.meetingTitle ?? base.meetingTitle),
    meetingType: MEETING_TYPE_OPTIONS.includes(String(source.meetingType || ''))
      ? String(source.meetingType)
      : base.meetingType,
    meetingDateTime: toDateTimeLocalValue(source.meetingDateTime ?? base.meetingDateTime),
    venue: String(source.venue ?? base.venue),
    guestAttendeesText: String(source.guestAttendeesText ?? base.guestAttendeesText),
    agenda: String(source.agenda ?? base.agenda),
    minutesText: String(source.minutesText ?? base.minutesText),
    attendeeIds: Array.from(
      new Set(
        (Array.isArray(source.attendeeIds) ? source.attendeeIds : [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ),
    actionItems: rawActionItems.map((item) => ({
      ...createEmptyActionItem(),
      ...(item && typeof item === 'object' ? item : {}),
      dueDate: toDateOnlyValue(item?.dueDate ?? ''),
      status: normalizeActionStatus(item?.status ?? 'Pending'),
    })),
  }
}
