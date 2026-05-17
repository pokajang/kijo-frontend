import React from 'react'
import {
  SERVICE_TABLE_COLUMN_LABELS,
  SERVICE_TABLE_TOGGLABLE_COLUMN_ORDER,
} from '../../config/serviceTableUiConfig'
import RecordsFilterPanelShared from '../shared/RecordsFilterPanelShared'

const ServiceRecordsFilterPanel = (props) => (
  <RecordsFilterPanelShared
    {...props}
    columnLabels={SERVICE_TABLE_COLUMN_LABELS}
    togglableColumnOrder={SERVICE_TABLE_TOGGLABLE_COLUMN_ORDER}
    dropdownColumnIdPrefix="service-col"
  />
)

export default ServiceRecordsFilterPanel
