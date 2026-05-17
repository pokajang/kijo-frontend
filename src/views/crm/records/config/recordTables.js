import AllRecordsTable from '../tables/all/AllRecordsTable.jsx'
import EquipmentRecordsTable from '../tables/service/EquipmentRecordsTable.jsx'
import IhRecordsTable from '../tables/service/IhRecordsTable.jsx'
import ManpowerRecordsTable from '../tables/service/ManpowerRecordsTable.jsx'
import SpecialRecordsTable from '../tables/service/SpecialRecordsTable.jsx'
import TrainingRecordsTable from '../tables/service/TrainingRecordsTable.jsx'

export const recordTablesByTab = {
  'all-tab': AllRecordsTable,
  'my-tab': AllRecordsTable,
  'training-tab': TrainingRecordsTable,
  'ih-tab': IhRecordsTable,
  'manpower-tab': ManpowerRecordsTable,
  'special-tab': SpecialRecordsTable,
  'equipment-tab': EquipmentRecordsTable,
}
