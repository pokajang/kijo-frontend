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
  closeViewModal,
  openViewModal,
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
  setShowViewModal: (show) => {
    if (!show) closeViewModal()
  },
  setSelectedRecord: (record) => openViewModal(record),
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
  setShowViewModal = () => {},
  setSelectedRecord = () => {},
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
  setShowViewModal,
  setSelectedRecord,
})

export const useRecordsActionBuilder = ({
  fetchQuotes,
  setQuotes,
  navigate,
  onRowMoved,
  modalBindings,
}) =>
  useMemo(
    () => (serviceKey) =>
      createHandlers({
        serviceKey,
        fetchQuotes,
        setQuotes,
        navigate,
        onRowMoved,
        ...modalBindings,
      }),
    [fetchQuotes, modalBindings, navigate, onRowMoved, setQuotes],
  )
