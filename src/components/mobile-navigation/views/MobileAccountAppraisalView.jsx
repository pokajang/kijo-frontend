import React from 'react'

import AppraisalRecords from '../../appraisal/AppraisalRecords'
import { useMobileNavSheet } from '../MobileNavSheetContext'

const MobileAccountAppraisalView = () => {
  const { goBack } = useMobileNavSheet()
  return <AppraisalRecords closeModal={goBack} />
}

export default MobileAccountAppraisalView
