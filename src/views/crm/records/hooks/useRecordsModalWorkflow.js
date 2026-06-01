import { useEffect, useReducer, useState } from 'react'
import { sharedRecordModals } from '../config/recordModals'
import { initialModalState, modalReducer } from './recordsModalState'

const NullComponent = () => null

export const useRecordsModalWorkflow = (activeTab) => {
  const [modalState, dispatchModal] = useReducer(modalReducer, initialModalState)
  const [isFailModalSubmitting, setIsFailModalSubmitting] = useState(false)
  const [isSuccessModalSubmitting, setIsSuccessModalSubmitting] = useState(false)
  const [isFollowUpModalSubmitting, setIsFollowUpModalSubmitting] = useState(false)
  const [isSyncingClientDetails, setIsSyncingClientDetails] = useState(false)

  const FailModal = sharedRecordModals.Fail || NullComponent
  const SuccessModal = sharedRecordModals.Success || NullComponent
  const FollowUpModalComponent = sharedRecordModals.FollowUp || NullComponent

  useEffect(() => {
    dispatchModal({ type: 'CLOSE_FAIL' })
    dispatchModal({ type: 'CLOSE_SUCCESS' })
    dispatchModal({ type: 'CLOSE_FOLLOWUP' })
  }, [activeTab])

  const openFailModal = ({ recordId, serviceKey }) => {
    dispatchModal({
      type: 'OPEN_FAIL',
      payload: { recordId, serviceKey },
    })
  }

  const closeFailModal = () => {
    dispatchModal({ type: 'CLOSE_FAIL' })
  }

  const setFailReason = (reason) => {
    dispatchModal({ type: 'SET_FAIL_REASON', payload: reason })
  }

  const openSuccessModal = ({ serviceKey, recordId, actionType = 'award' }) => {
    dispatchModal({
      type: 'OPEN_SUCCESS',
      payload: { recordId, serviceKey, actionType },
    })
  }

  const closeSuccessModal = () => {
    dispatchModal({ type: 'CLOSE_SUCCESS' })
  }

  const setSuccessReason = (reason) => {
    dispatchModal({ type: 'SET_SUCCESS_REASON', payload: reason })
  }

  const setSuccessDate = (date) => {
    dispatchModal({ type: 'SET_SUCCESS_DATE', payload: date })
  }

  const setSuccessDescription = (description) => {
    dispatchModal({ type: 'SET_SUCCESS_DESCRIPTION', payload: description })
  }

  const setSuccessLoa = (loa) => {
    dispatchModal({ type: 'SET_SUCCESS_LOA', payload: loa })
  }

  const openFollowUpModal = ({ quote, serviceKey }) => {
    dispatchModal({ type: 'OPEN_FOLLOWUP', payload: { quote, serviceKey } })
  }

  const closeFollowUpModal = () => {
    dispatchModal({ type: 'CLOSE_FOLLOWUP' })
  }

  const setFollowUpRemarks = (remarks) => {
    dispatchModal({ type: 'SET_FOLLOWUP_REMARKS', payload: remarks })
  }

  const setFollowUpDate = (date) => {
    dispatchModal({ type: 'SET_FOLLOWUP_DATE', payload: date })
  }

  return {
    modalState,
    dispatchModal,
    FailModal,
    SuccessModal,
    FollowUpModalComponent,
    isFailModalSubmitting,
    setIsFailModalSubmitting,
    isSuccessModalSubmitting,
    setIsSuccessModalSubmitting,
    isFollowUpModalSubmitting,
    setIsFollowUpModalSubmitting,
    isSyncingClientDetails,
    setIsSyncingClientDetails,
    openFailModal,
    closeFailModal,
    setFailReason,
    openSuccessModal,
    closeSuccessModal,
    setSuccessReason,
    setSuccessDate,
    setSuccessDescription,
    setSuccessLoa,
    openFollowUpModal,
    closeFollowUpModal,
    setFollowUpRemarks,
    setFollowUpDate,
  }
}
