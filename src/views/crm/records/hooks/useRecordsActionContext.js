import { useMemo } from 'react'
import { createHandlers } from '../services/recordsActions'

export const createWorkflowModalBindings = ({
  closeFailModal,
  setFailReason,
  openFailModal,
  closeSuccessModal,
  setSuccessReason,
  setSuccessDate,
  setSuccessDescription,
  setSuccessLoa,
  openSuccessModal,
  getFailServiceKey = () => null,
  getSuccessServiceKey = () => null,
  getSuccessActionType = () => 'award',
}) => ({
  setShowFailModal: (show) => {
    if (!show) closeFailModal()
  },
  setSelectedRecordIdForFail: (id) =>
    openFailModal({ recordId: id, serviceKey: getFailServiceKey() }),
  setFailureReason: (reason) => setFailReason(reason),
  setShowSuccessModal: (show) => {
    if (!show) closeSuccessModal()
  },
  setSuccessReason: (reason) => setSuccessReason(reason),
  setAwardDate: (date) => setSuccessDate(date),
  setDescription: (description) => setSuccessDescription(description),
  setClientLoaRefNo: (loa) => setSuccessLoa(loa),
  setSelectedRecordIdForSuccess: (id) =>
    openSuccessModal({
      recordId: id,
      serviceKey: getSuccessServiceKey(),
      actionType: getSuccessActionType(),
    }),
})

export const createStateModalBindings = ({
  setShowFailModal,
  setFailureReason,
  setSelectedRecordIdForFail,
  setShowSuccessModal,
  setSuccessReason,
  setAwardDate,
  setDescription,
  setClientLoaRefNo,
  setSelectedRecordIdForSuccess,
}) => ({
  setShowFailModal,
  setFailureReason,
  setSelectedRecordIdForFail,
  setShowSuccessModal,
  setSuccessReason,
  setAwardDate,
  setDescription,
  setClientLoaRefNo,
  setSelectedRecordIdForSuccess,
})

export const useRecordsActionBuilder = ({
  fetchQuotes,
  setQuotes,
  navigate,
  onRowMoved,
  onActionSuccess = onRowMoved ? ({ status }) => onRowMoved(status) : undefined,
  refreshAfterLocalDelete = false,
  modalBindings,
  getReturnTo,
}) =>
  useMemo(
    () => (serviceKey) =>
      createHandlers({
        serviceKey,
        fetchQuotes,
        setQuotes,
        navigate,
        onActionSuccess,
        refreshAfterLocalDelete,
        getReturnTo,
        ...modalBindings,
      }),
    [
      fetchQuotes,
      getReturnTo,
      modalBindings,
      navigate,
      onActionSuccess,
      refreshAfterLocalDelete,
      setQuotes,
    ],
  )
