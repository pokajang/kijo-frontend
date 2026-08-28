import React, { useState } from 'react'
import { CCard, CCardBody, CCol, CRow } from '@coreui/react'
import { DataTableCardHeader, DataTableStatsToggle } from '../../../components/datatable'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { financialModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import PaymentQueueRecords from '../../../components/salary/PaymentQueueRecords'
import PaymentSummaryPanel from '../../../components/salary/PaymentSummaryPanel'
import { useDataTableStatsVisibility } from '../../../hooks/datatable'

const FinancialPaymentQueuePage = () => {
  const [scopeLabel, setScopeLabel] = useState('')
  const [queueRefreshKey, setQueueRefreshKey] = useState(0)
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('financial.payment-queue')

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
            <DataTableCardHeader title="Payment Queue" scopeLabel={scopeLabel}>
              <DataTableStatsToggle
                visible={statsVisible}
                onToggle={toggleStatsVisible}
                controlsVisible={controlsVisible}
                onControlsToggle={toggleControlsVisible}
              />
            </DataTableCardHeader>
            <CCardBody className="records-page-card-body">
              <PaymentSummaryPanel
                onQueueChanged={() => setQueueRefreshKey((value) => value + 1)}
              />
              <PaymentQueueRecords
                key={queueRefreshKey}
                onScopeLabelChange={setScopeLabel}
                statsVisible={statsVisible}
                controlsVisible={controlsVisible}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default FinancialPaymentQueuePage
