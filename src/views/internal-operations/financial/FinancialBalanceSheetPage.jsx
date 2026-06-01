import React from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { financialModuleTabs } from '../../../components/navigation/moduleNavConfigs'

const FinancialBalanceSheetPage = () => (
  <>
    <ModuleNavStrip
      tabs={financialModuleTabs}
      activeTab="balance-sheet"
      ariaLabel="Financial sections"
    />
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4 records-page-card">
          <CCardHeader className="records-page-card-header">
            <strong>Balance Sheet</strong>
          </CCardHeader>
          <CCardBody className="records-page-card-body">
            <div className="border rounded p-3 bg-body-tertiary text-muted">
              Balance sheet reporting will be added here when the financial statement data is ready.
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  </>
)

export default FinancialBalanceSheetPage
