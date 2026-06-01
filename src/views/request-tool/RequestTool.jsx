import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import ModuleNavStrip from '../../components/navigation/ModuleNavStrip'
import { supportModuleTabs } from '../../components/navigation/moduleNavConfigs'
import { useToolRequestActions } from './actionHandlers'
import RequestFormFields from './RequestFormFields'
import RequestTable from './RequestTable'

/**
 * RequestTool
 *
 * Parent component that ties together the form and table
 * for tool requests, using the custom hook for state
 * and actions.
 */
export default function RequestTool() {
  const navigate = useNavigate()
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [showPendingNotice, setShowPendingNotice] = useState(false)

  const {
    records,
    recordsLoading,
    pendingAchievementRecord,
    requestData,
    showModal,
    modalRecord,
    newAchievement,
    handleChange,
    handleSubmitClick,
    handleCancel,
    openModal,
    handleSaveAchievement,
    setNewAchievement,
    setShowModal,
  } = useToolRequestActions()

  const handleRequestToolClick = () => {
    if (pendingAchievementRecord) {
      setShowPendingNotice(true)
      return
    }

    setShowRequestForm(true)
  }

  const handleFormCancel = () => {
    handleCancel()
    setShowRequestForm(false)
  }

  const handleFormSubmit = async () => {
    const submitted = await handleSubmitClick()
    if (submitted) {
      setShowRequestForm(false)
      return
    }

    if (pendingAchievementRecord) {
      setShowRequestForm(false)
      setShowPendingNotice(true)
    }
  }

  const handleUpdatePendingAchievement = () => {
    if (pendingAchievementRecord) {
      openModal(pendingAchievementRecord)
    }
    setShowPendingNotice(false)
  }

  return (
    <>
      <ModuleNavStrip tabs={supportModuleTabs} ariaLabel="Support sections" />

      <CModal visible={showRequestForm} onClose={handleFormCancel} size="lg" alignment="center">
        <CModalHeader closeButton>
          <CModalTitle>Asset Request</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <RequestFormFields
            requestData={requestData}
            handleChange={handleChange}
            handleSubmitClick={handleFormSubmit}
            handleCancel={handleFormCancel}
          />
        </CModalBody>
      </CModal>

      <CModal
        visible={showPendingNotice}
        onClose={() => setShowPendingNotice(false)}
        alignment="center"
      >
        <CModalHeader closeButton>
          <CModalTitle>Update Achievement Required</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-2">
            You still have a previous tool request without an achievement update.
          </p>
          <p className="mb-0 text-muted">
            Please update the achievement for the old record before submitting a new request.
          </p>
          {pendingAchievementRecord && (
            <div className="mt-3 small">
              <div>
                <strong>Equipment:</strong>{' '}
                {pendingAchievementRecord.equipment_detail ||
                  pendingAchievementRecord.equipment ||
                  '-'}
              </div>
              <div>
                <strong>Use Date:</strong> {pendingAchievementRecord.use_start_date || '-'} to{' '}
                {pendingAchievementRecord.use_end_date || '-'}
              </div>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setShowPendingNotice(false)}
          >
            Close
          </CButton>
          <CButton color="primary" size="sm" onClick={handleUpdatePendingAchievement}>
            Update Achievement
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Table of past requests and update modal */}
      <RequestTable
        records={records}
        loading={recordsLoading}
        showRequestForm={showRequestForm}
        requestToolDisabled={Boolean(pendingAchievementRecord)}
        onRequestToolClick={handleRequestToolClick}
        openModal={openModal}
        showModal={showModal}
        setShowModal={setShowModal}
        modalRecord={modalRecord}
        newAchievement={newAchievement}
        setNewAchievement={setNewAchievement}
        handleSaveAchievement={handleSaveAchievement}
        onViewRecord={(record) =>
          navigate(`/support/requests/${record.id}`, {
            state: { record, returnTo: '/support/requests' },
          })
        }
      />
    </>
  )
}
