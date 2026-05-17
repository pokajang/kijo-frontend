import {
  fetchEquipmentQuotes,
  fetchIHQuotes,
  fetchManpowerQuotes,
  fetchSpecialQuotes,
  fetchTrainingQuotes,
} from '../services/quoteService.js'

const sortByCreatedDateDesc = (a, b) => {
  const aTime = Date.parse(a?.dateCreated || 0)
  const bTime = Date.parse(b?.dateCreated || 0)
  return bTime - aTime
}

const tagWithService = (rows = [], serviceTab) =>
  rows.map((row) => ({
    ...row,
    serviceTab,
  }))

const fetchAllQuotes = async () => {
  const [training, ih, manpower, special, equipment] = await Promise.all([
    fetchTrainingQuotes(),
    fetchIHQuotes(),
    fetchManpowerQuotes(),
    fetchSpecialQuotes(),
    fetchEquipmentQuotes(),
  ])

  return [
    ...tagWithService(training, 'training-tab'),
    ...tagWithService(ih, 'ih-tab'),
    ...tagWithService(manpower, 'manpower-tab'),
    ...tagWithService(special, 'special-tab'),
    ...tagWithService(equipment, 'equipment-tab'),
  ].sort(sortByCreatedDateDesc)
}

export const fetchersByTab = {
  'all-tab': fetchAllQuotes,
  'my-tab': fetchAllQuotes,
  'training-tab': fetchTrainingQuotes,
  'ih-tab': fetchIHQuotes,
  'manpower-tab': fetchManpowerQuotes,
  'special-tab': fetchSpecialQuotes,
  'equipment-tab': fetchEquipmentQuotes,
}
