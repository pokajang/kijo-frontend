import React from 'react'
import { CCol, CFormLabel, CFormSelect } from '@coreui/react'
import { COLUMN_LABELS, TOGGLABLE_COLUMN_ORDER } from '../../config/allRecordsTableConfig'
import RecordsFilterPanelShared from '../shared/RecordsFilterPanelShared'

const AllRecordsFilterPanel = (props) => {
  const { serviceFilter, setServiceFilter } = props

  return (
    <RecordsFilterPanelShared
      {...props}
      columnLabels={COLUMN_LABELS}
      togglableColumnOrder={TOGGLABLE_COLUMN_ORDER}
      dropdownColumnIdPrefix="col"
      renderExtraAdvancedFilters={() => (
        <CCol xs={6} md={3} lg={2}>
          <CFormLabel>Service</CFormLabel>
          <CFormSelect value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="training-tab">Training</option>
            <option value="ih-tab">Industrial Hygiene</option>
            <option value="manpower-tab">Manpower Supply</option>
            <option value="equipment-tab">Equipment Supply</option>
            <option value="special-tab">Special</option>
          </CFormSelect>
        </CCol>
      )}
    />
  )
}

export default AllRecordsFilterPanel
