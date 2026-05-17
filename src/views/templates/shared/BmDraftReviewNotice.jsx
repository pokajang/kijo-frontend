import React from 'react'
import { CAlert } from '@coreui/react'
import { isMachineDraftBmTemplate } from './templateUtils'

const BmDraftReviewNotice = ({ record }) => {
  if (!isMachineDraftBmTemplate(record)) return null

  return (
    <CAlert color="warning" className="mb-3">
      <strong>Review the Bahasa Melayu translation before saving.</strong>
      <div className="mt-1">
        This copy was created with Google Translate. Check every section properly, then save the
        proposal. After saving, this BM proposal is final and will be available in BM quotation
        selection.
      </div>
    </CAlert>
  )
}

export default BmDraftReviewNotice
