import React from 'react'
import { CButton, CSpinner } from '@coreui/react'
import MeetingMinuteDetailsStep from './MeetingMinuteDetailsStep'
import MeetingMinuteNotesStep from './MeetingMinuteNotesStep'

export default function MeetingMinuteEditMode({
  currentStep,
  stepDetails,
  stepNotes,
  hasPersistedRecord,
  submitting,
  isViewMode,
  isEditRoute,
  form,
  validationErrors,
  isFormLocked,
  loadingStaff,
  staff,
  sessionStaffId,
  isDraftRecord,
  meetingTypeOptions,
  onSubmit,
  onGoToStep,
  onCancel,
  onSaveDraft,
  onDiscardDraft,
  onChangeField,
  onToggleAttendee,
  onAddActionItem,
  onActionItemChange,
  onRemoveActionItem,
}) {
  return (
    <form id="meeting-minutes-form" onSubmit={onSubmit}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <CButton
          type="button"
          size="sm"
          color={currentStep === stepDetails ? 'primary' : 'secondary'}
          variant={currentStep === stepDetails ? undefined : 'outline'}
          onClick={() => onGoToStep(stepDetails)}
          disabled={submitting}
        >
          1. Meeting Details
        </CButton>
        <CButton
          type="button"
          size="sm"
          color={currentStep === stepNotes ? 'primary' : 'secondary'}
          variant={currentStep === stepNotes ? undefined : 'outline'}
          onClick={() => {
            if (hasPersistedRecord) onGoToStep(stepNotes)
          }}
          disabled={!hasPersistedRecord || submitting}
        >
          2. Meeting Notes
        </CButton>
      </div>

      {currentStep === stepDetails && (
        <MeetingMinuteDetailsStep
          form={form}
          validationErrors={validationErrors}
          isFormLocked={isFormLocked}
          loadingStaff={loadingStaff}
          staff={staff}
          sessionStaffId={sessionStaffId}
          meetingTypeOptions={meetingTypeOptions}
          onChangeField={onChangeField}
          onToggleAttendee={onToggleAttendee}
        />
      )}

      {currentStep === stepNotes && (
        <MeetingMinuteNotesStep
          form={form}
          validationErrors={validationErrors}
          isFormLocked={isFormLocked}
          staff={staff}
          onChangeField={onChangeField}
          onAddActionItem={onAddActionItem}
          onActionItemChange={onActionItemChange}
          onRemoveActionItem={onRemoveActionItem}
        />
      )}

      <div className="d-flex gap-2">
        <CButton color="secondary" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </CButton>
        {currentStep === stepNotes && (
          <CButton
            type="button"
            color="secondary"
            variant="outline"
            onClick={() => onGoToStep(stepDetails)}
            disabled={submitting}
          >
            Back to Details
          </CButton>
        )}
        {!isViewMode && (
          <>
            {(isDraftRecord || !hasPersistedRecord) && (
              <>
                <CButton
                  type="button"
                  color="secondary"
                  variant="outline"
                  onClick={onSaveDraft}
                  disabled={submitting}
                >
                  Save Draft
                </CButton>
                <CButton
                  type="button"
                  color="danger"
                  variant="outline"
                  onClick={onDiscardDraft}
                  disabled={submitting}
                >
                  Discard Draft
                </CButton>
              </>
            )}
            <CButton color="primary" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  Saving...
                </>
              ) : currentStep === stepDetails ? (
                'Save & Continue'
              ) : isEditRoute ? (
                isDraftRecord ? (
                  'Save Minutes'
                ) : (
                  'Update Minutes'
                )
              ) : (
                'Save Minutes'
              )}
            </CButton>
          </>
        )}
      </div>
    </form>
  )
}
