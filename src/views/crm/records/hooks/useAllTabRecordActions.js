import { useCallback, useMemo } from 'react'
import dialog from '../../../../components/dialog/dialogService'
import { endpointsByService } from '../services/recordsActions'

export const useAllTabRecordActions = ({
  buildHandlers,
  openFailModal,
  setFailReason,
  openSuccessModal,
  isSyncingClientDetails,
  setIsSyncingClientDetails,
}) => {
  const runByRecordService = useCallback(
    (record, actionName, ...args) => {
      const serviceKey = record?.serviceTab
      if (!serviceKey) {
        console.error('Service key is missing for record:', record)
        dialog.alert('Service type not identified for this quotation.')
        return
      }
      if (!endpointsByService[serviceKey]) {
        console.error('No endpoints configured for service:', serviceKey)
        dialog.alert(`Service endpoint not configured for: ${serviceKey}`)
        return
      }

      const serviceHandlers = buildHandlers(serviceKey)
      const action = serviceHandlers[actionName]
      if (typeof action !== 'function') {
        console.error('Action not found:', actionName, 'for service:', serviceKey)
        dialog.alert(`Action '${actionName}' is not available for this service.`)
        return
      }

      return action(...args)
    },
    [buildHandlers],
  )

  const handleAllChangeToFail = useCallback(
    (record) => {
      openFailModal({ recordId: record?.id, serviceKey: record?.serviceTab })
      setFailReason('')
    },
    [openFailModal, setFailReason],
  )

  const handleAllChangeToSuccess = useCallback(
    (record) => {
      openSuccessModal({
        serviceKey: record?.serviceTab || null,
        recordId: record?.id || null,
        actionType: 'award',
      })
    },
    [openSuccessModal],
  )

  const handleAllReAward = useCallback(
    (record) => {
      openSuccessModal({
        serviceKey: record?.serviceTab || null,
        recordId: record?.id || null,
        actionType: 're-award',
      })
    },
    [openSuccessModal],
  )

  const handleAllSyncClientDetails = useCallback(
    async (record) => {
      if (isSyncingClientDetails) return
      setIsSyncingClientDetails(true)
      try {
        await runByRecordService(record, 'handleSyncClientDetails', record)
      } finally {
        setIsSyncingClientDetails(false)
      }
    },
    [isSyncingClientDetails, runByRecordService, setIsSyncingClientDetails],
  )

  return useMemo(
    () => ({
      runByRecordService,
      handleAllChangeToFail,
      handleAllChangeToSuccess,
      handleAllReAward,
      handleAllSyncClientDetails,
    }),
    [
      handleAllChangeToFail,
      handleAllChangeToSuccess,
      handleAllReAward,
      handleAllSyncClientDetails,
      runByRecordService,
    ],
  )
}
