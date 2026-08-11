import React from 'react'
import { DataTableStatusBadge } from '../../../../../components/datatable'
import { getFirstTouchStatusLabel, getFirstTouchStatusTone } from '../clientFirstTouchUtils'

const FirstTouchStatusBadge = ({ status }) => (
  <DataTableStatusBadge tone={getFirstTouchStatusTone(status)}>
    {getFirstTouchStatusLabel(status)}
  </DataTableStatusBadge>
)

export default FirstTouchStatusBadge
