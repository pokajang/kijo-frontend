import React from 'react'
import RecordDetailSection, { RecordDetailField } from './RecordDetailSection'
import { getProposalLanguageLabel } from './quotationDetailUtils'

const RecordQuotationContextSection = ({ record, showProposalLanguage = true }) => (
  <RecordDetailSection title="Quotation Context">
    {showProposalLanguage ? (
      <RecordDetailField
        label="Proposal Language"
        value={getProposalLanguageLabel(record?.proposalLanguage)}
      />
    ) : null}
    <RecordDetailField label="Inquiry Source" value={record?.inquirySource} />
    <RecordDetailField label="Source Remarks" value={record?.inquirySourceRemarks} />
  </RecordDetailSection>
)

export default RecordQuotationContextSection
