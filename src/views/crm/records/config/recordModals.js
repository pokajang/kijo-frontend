import ViewEquipmentDetailsModal from '../modals/equipment/ViewEquipmentDetailsModal.jsx'
import ViewIHDetailsModal from '../modals/ih/ViewIHDetailsModal.jsx'
import ViewManpowerDetailsModal from '../modals/manpower/ViewManpowerDetailsModal.jsx'
import ChangeToFailModal from '../modals/shared/ChangeToFailModal.jsx'
import FollowUpModal from '../modals/shared/FollowUpModal.jsx'
import ChangeToSuccessModal from '../modals/shared/ChangeToSuccessModal.jsx'
import ViewSpecialDetailsModal from '../modals/special/ViewSpecialDetailsModal.jsx'
import ViewTrainingDetailsModal from '../modals/training/ViewTrainingDetailsModal.jsx'

export const sharedRecordModals = {
  Fail: ChangeToFailModal,
  Success: ChangeToSuccessModal,
  FollowUp: FollowUpModal,
}

export const modalsByTab = {
  'training-tab': {
    View: ViewTrainingDetailsModal,
    ...sharedRecordModals,
  },
  'ih-tab': {
    View: ViewIHDetailsModal,
    ...sharedRecordModals,
  },
  'manpower-tab': {
    View: ViewManpowerDetailsModal,
    ...sharedRecordModals,
  },
  'special-tab': {
    View: ViewSpecialDetailsModal,
    ...sharedRecordModals,
  },
  'equipment-tab': {
    View: ViewEquipmentDetailsModal,
    ...sharedRecordModals,
  },
}
