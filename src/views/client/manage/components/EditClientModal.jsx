import React from 'react'
import { CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CButton } from '@coreui/react'
import EditPicCard from './EditPicCard'
import EditCompanyCard from './EditCompanyCard'

const EditClientModal = ({
  visible,
  onClose,
  editMode,
  selectedPic,
  setSelectedPic,
  selectedClient,
  setSelectedClient,
  alertMessage,
  alertColor,
  onDismissAlert,
  picList,
  setPicList,
  newPicList,
  setNewPicList,
  showSaveReminder,
  setShowSaveReminder,
  showBranchSaveReminder,
  setShowBranchSaveReminder,
  editBranchLoading,
  newPICForm,
  onNewPICInputChange,
  onAddNewPIC,
  isDuplicatePIC,
  duplicatePICName,
  partialMatchPIC,
  isDuplicateEmail,
  duplicateEmail,
  onSave,
}) => {
  return (
    <CModal scrollable visible={visible} onClose={onClose} alignment="center" size="lg">
      <CModalHeader closeButton>
        <CModalTitle>
          {editMode === 'company' ? 'Edit Company Details' : 'Edit Person In Charge Details'}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        {editMode === 'pic' && selectedPic && (
          <EditPicCard
            alertMessage={alertMessage}
            alertColor={alertColor}
            onDismissAlert={onDismissAlert}
            selectedPic={selectedPic}
            setSelectedPic={setSelectedPic}
          />
        )}

        {editMode === 'company' && selectedClient && (
          <EditCompanyCard
            selectedClient={selectedClient}
            setSelectedClient={setSelectedClient}
            picList={picList}
            setPicList={setPicList}
            newPicList={newPicList}
            setNewPicList={setNewPicList}
            showSaveReminder={showSaveReminder}
            setShowSaveReminder={setShowSaveReminder}
            showBranchSaveReminder={showBranchSaveReminder}
            setShowBranchSaveReminder={setShowBranchSaveReminder}
            editBranchLoading={editBranchLoading}
            newPICForm={newPICForm}
            onNewPICInputChange={onNewPICInputChange}
            onAddNewPIC={onAddNewPIC}
            isDuplicatePIC={isDuplicatePIC}
            duplicatePICName={duplicatePICName}
            partialMatchPIC={partialMatchPIC}
            isDuplicateEmail={isDuplicateEmail}
            duplicateEmail={duplicateEmail}
          />
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={onSave}>
          Save Changes
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default EditClientModal
