import React from 'react'
import EquipmentRecordDetails from './equipment/EquipmentRecordDetails'
import HygieneRecordDetails from './hygiene/HygieneRecordDetails'
import ManpowerRecordDetails from './manpower/ManpowerRecordDetails'
import SpecialRecordDetails from './special/SpecialRecordDetails'
import TrainingRecordDetails from './training/TrainingRecordDetails'

const serviceDetailsByTab = {
  'training-tab': TrainingRecordDetails,
  'ih-tab': HygieneRecordDetails,
  'manpower-tab': ManpowerRecordDetails,
  'equipment-tab': EquipmentRecordDetails,
  'special-tab': SpecialRecordDetails,
}

const RecordServiceDetails = ({ serviceTab, record, getDateOnly }) => {
  const ServiceDetails = serviceDetailsByTab[serviceTab]

  return ServiceDetails ? <ServiceDetails record={record} getDateOnly={getDateOnly} /> : null
}

export default RecordServiceDetails
