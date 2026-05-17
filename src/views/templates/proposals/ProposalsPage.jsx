import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CAlert, CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
import RecordsServiceStrip from '../../../components/records/RecordsServiceStrip'
import TemplateLanguageDropdown from '../shared/TemplateLanguageDropdown'
import TemplateProposalTable from '../shared/TemplateProposalTable'
import TrainingTemplateTable from '../list-training/TemplateTable'
import AllProposalsTable from './AllProposalsTable'
import { useProposalsController } from './useProposalsController'

const ProposalsPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    activeTab,
    activeType,
    dataByType,
    error,
    handleCreateBmCopy,
    handleDelete,
    handleLanguageChange,
    handleTabChange,
    language,
    loading,
    proposalTabOptions,
  } = useProposalsController()

  const returnTo = `${location.pathname}${location.search}`

  const renderTable = () => {
    if (!activeType) {
      return (
        <AllProposalsTable
          dataByType={dataByType}
          onDelete={handleDelete}
          onCreateBmCopy={handleCreateBmCopy}
          loading={loading}
          language={language}
        />
      )
    }

    if (activeType === 'training') {
      return (
        <TrainingTemplateTable
          data={dataByType.training}
          onDelete={(id) => handleDelete('training', id)}
          onCreateBmCopy={(id, row) => handleCreateBmCopy('training', id, row)}
          loading={loading}
        />
      )
    }

    return (
      <TemplateProposalTable
        type={activeType}
        data={dataByType[activeType]}
        onDelete={(id) => handleDelete(activeType, id)}
        onCreateBmCopy={(id, row) => handleCreateBmCopy(activeType, id, row)}
        loading={loading}
      />
    )
  }

  return (
    <CRow>
      <CCol xs={12}>
        <RecordsServiceStrip
          tabs={proposalTabOptions}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          ariaLabel="Proposal record groups"
          rightControls={
            <TemplateLanguageDropdown value={language} onChange={handleLanguageChange} />
          }
        />
        <CCard className="mb-4 records-page-card">
          <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap records-page-card-header">
            <strong>Proposals</strong>
            <CButton
              color="primary"
              size="sm"
              className="d-inline-flex align-items-center gap-1"
              onClick={() => navigate('/templates/create', { state: { returnTo } })}
            >
              <CIcon icon={cilPlus} />
              Create Proposal
            </CButton>
          </CCardHeader>
          <CCardBody className="records-page-card-body">
            {error && (
              <CAlert color="danger" className="mb-3">
                Failed: {error}
              </CAlert>
            )}
            {renderTable()}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default ProposalsPage
