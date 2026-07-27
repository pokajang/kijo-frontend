import React from 'react'
import { CCol } from '@coreui/react'
import RecordClientContactSection from '../../RecordClientContactSection'
import RecordDetailSection, { RecordDetailField } from '../../RecordDetailSection'
import RecordPricingGovernanceSection from '../../RecordPricingGovernanceSection'
import RecordQuotationContextSection from '../../RecordQuotationContextSection'
import QuotationCalculationTable from '../../QuotationCalculationTable'
import { formatMoney } from '../../quotationDetailUtils'
import { buildEquipmentCalculationRows } from './equipmentRecordDetailUtils'

const EquipmentRecordDetails = ({ record }) => {
  const items = Array.isArray(record?.lineItems) ? record.lineItems : []

  return (
    <>
      <RecordClientContactSection record={record} />
      <RecordQuotationContextSection record={record} showProposalLanguage={false} />

      <RecordDetailSection title="Equipment Items">
        {items.length > 0 ? (
          items.map((item, index) => (
            <RecordDetailField key={item.id ?? index} label={`Item ${index + 1}`} md={12} lg={12}>
              <div className="d-grid gap-1">
                <strong>{item.itemName || 'Unnamed equipment'}</strong>
                <span>{item.description || 'No description provided'}</span>
                <span className="small text-body-secondary">
                  Category: {item.categoryId || 'Not provided'} · Unit:{' '}
                  {item.unit || 'Not provided'}
                </span>
                <span className="small text-body-secondary">
                  Saved base cost: {formatMoney(item.unitPrice)} · Saved quoted unit price:{' '}
                  {formatMoney(item.markedUp)}
                </span>
                {item.supplierName ? (
                  <span className="small text-body-secondary">
                    Current catalog reference: {item.supplierName}
                    {Number(item.supplierPrice) > 0 ? ` · ${formatMoney(item.supplierPrice)}` : ''}
                    {item.priceDate ? ` · ${item.priceDate}` : ''}
                  </span>
                ) : null}
              </div>
            </RecordDetailField>
          ))
        ) : (
          <RecordDetailField label="Items" value="No equipment items recorded" md={12} lg={12} />
        )}
      </RecordDetailSection>

      <RecordPricingGovernanceSection serviceKey="equipment" record={record} />

      <RecordDetailSection title="Quotation Calculation" bodyClassName="pt-0">
        <CCol xs={12}>
          <QuotationCalculationTable
            rows={buildEquipmentCalculationRows(record)}
            caption="Equipment quotation calculation from item totals to grand total"
          />
        </CCol>
      </RecordDetailSection>
    </>
  )
}

export default EquipmentRecordDetails
