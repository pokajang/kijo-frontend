import React, { useState } from 'react'
import { CCard, CCardBody, CCol, CRow } from '@coreui/react'
import { DataTableCardHeader } from '../../../components/datatable'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { financialModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import PaymentQueueRecords from '../../../components/salary/PaymentQueueRecords'

const FinancialPaymentQueuePage = () => {
  const [scopeLabel, setScopeLabel] = useState('')

  return (
    <>
      <ModuleNavStrip
        tabs={financialModuleTabs}
        activeTab="payment-queue"
        ariaLabel="Financial sections"
      />
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4 records-page-card">
            <DataTableCardHeader title="Payment Queue" scopeLabel={scopeLabel} />
            <CCardBody className="records-page-card-body">
              <PaymentQueueRecords onScopeLabelChange={setScopeLabel} />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default FinancialPaymentQueuePage
