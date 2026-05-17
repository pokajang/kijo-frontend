import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MeetingMinuteEditMode from './MeetingMinuteEditMode'

const baseProps = {
  currentStep: 1,
  stepDetails: 1,
  stepNotes: 2,
  hasPersistedRecord: false,
  submitting: false,
  isViewMode: false,
  isEditRoute: false,
  form: {
    meetingTitle: '',
    meetingType: 'Ad Hoc',
    meetingDateTime: '',
    venue: '',
    guestAttendeesText: '',
    agenda: '',
    minutesText: '',
    actionItems: [],
    attendeeIds: [],
  },
  validationErrors: {},
  isFormLocked: false,
  loadingStaff: false,
  staff: [{ staff_id: 42, full_name: 'Creator User', name_code: 'CU' }],
  sessionStaffId: 42,
  isDraftRecord: true,
  meetingTypeOptions: ['Monthly', 'Weekly', 'Ad Hoc'],
  onSubmit: vi.fn((event) => event.preventDefault()),
  onGoToStep: vi.fn(),
  onCancel: vi.fn(),
  onSaveDraft: vi.fn(),
  onDiscardDraft: vi.fn(),
  onChangeField: vi.fn(),
  onToggleAttendee: vi.fn(),
  onAddActionItem: vi.fn(),
  onActionItemChange: vi.fn(),
  onRemoveActionItem: vi.fn(),
}

describe('MeetingMinuteEditMode draft controls', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders field-level validation and draft actions', () => {
    render(
      <MeetingMinuteEditMode
        {...baseProps}
        validationErrors={{
          meetingTitle: 'Meeting title is required.',
          meetingDateTime: 'Meeting date and time is required.',
          attendeeIds: 'Select at least one attendee.',
        }}
      />,
    )

    expect(screen.getByText('Meeting title is required.')).toBeInTheDocument()
    expect(screen.getByText('Meeting date and time is required.')).toBeInTheDocument()
    expect(screen.getByText('Select at least one attendee.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Discard Draft' })).toBeInTheDocument()
  })

  it('supports select-me attendee shortcut', () => {
    render(<MeetingMinuteEditMode {...baseProps} />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Select Me' })[0])

    expect(baseProps.onToggleAttendee).toHaveBeenCalledWith(42)
  })
})
