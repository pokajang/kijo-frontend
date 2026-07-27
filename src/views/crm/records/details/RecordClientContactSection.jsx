import React from 'react'
import RecordDetailSection, { RecordDetailField } from './RecordDetailSection'
import { formatAddress } from './quotationDetailUtils'

const RecordClientContactSection = ({ record }) => {
  const client = record?.clientDetails || {}

  return (
    <RecordDetailSection title="Client & Contact">
      <RecordDetailField label="Company" value={client.companyName} />
      <RecordDetailField label="SSM Number" value={client.ssmNumber} />
      <RecordDetailField label="PIC" value={client.fullName || record?.personInCharge} />
      <RecordDetailField label="Company Address" value={formatAddress(client)} md={12} lg={12} />
      <RecordDetailField label="PIC Position" value={client.position} />
      <RecordDetailField label="PIC Email" value={client.email} />
      <RecordDetailField label="PIC Mobile" value={client.mobileNumber} />
    </RecordDetailSection>
  )
}

export default RecordClientContactSection
