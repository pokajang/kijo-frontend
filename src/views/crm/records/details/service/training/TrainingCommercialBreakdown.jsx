import React from 'react'
import QuotationCalculationTable from '../../QuotationCalculationTable'
import { buildTrainingCalculationRows } from './trainingRecordDetailUtils'

const TrainingCommercialBreakdown = ({ record }) => (
  <QuotationCalculationTable
    rows={buildTrainingCalculationRows(record)}
    caption="Training quotation calculation from training cost to grand total"
  />
)

export default TrainingCommercialBreakdown
