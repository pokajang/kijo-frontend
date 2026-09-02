import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CAlert, CButton, CCard, CCardBody, CCol, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
import { DataTableCardHeader, DataTableStatsToggle } from '../../../components/datatable'
import RecordsServiceStrip from '../../../components/records/RecordsServiceStrip'
import { useDataTableStatsVisibility } from '../../../hooks/datatable'
import TemplateLanguageDropdown from '../shared/TemplateLanguageDropdown'
import TemplateProposalTable from '../shared/TemplateProposalTable'
import TrainingTemplateTable from '../list-training/TemplateTable'
import AllProposalsTable from './AllProposalsTable'
import { useProposalsController } from './useProposalsController'
import SpecialCategoryManager from '../shared/SpecialCategoryManager'
import { useAuth } from '../../../auth/AuthProvider'
import { hasAnyAllowedRole } from '../../../utils/roles'

const ProposalsPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const canManageCategories = hasAnyAllowedRole(user?.roles, ['Manager', 'System Admin'])
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
    refreshData,
  } = useProposalsController()
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('templates.proposals')

  const returnTo = `${location.pathname}${location.search}`

  const renderTable = () => {
    if (!activeType) {
      return (
        <AllProposalsTable
          dataByType={dataByType}
          onDelete={handleDelete}
          onCreateBmCopy={handleCreateBmCopy}
          loading={loading}
          statsVisible={statsVisible}
          controlsVisible={controlsVisible}
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
          statsVisible={statsVisible}
          controlsVisible={controlsVisible}
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
        statsVisible={statsVisible}
        controlsVisible={controlsVisible}
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
          <DataTableCardHeader title="Proposals" scopeLabel={language === 'ms-MY' ? 'BM' : 'ENG'}>
            <DataTableStatsToggle
              visible={statsVisible}
              onToggle={toggleStatsVisible}
              controlsVisible={controlsVisible}
              onControlsToggle={toggleControlsVisible}
            />
            {activeType === 'special' && canManageCategories && (
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                onClick={() => setShowCategoryManager(true)}
              >
                Manage Categories
              </CButton>
            )}
            <CButton
              color="primary"
              size="sm"
              className="d-inline-flex align-items-center gap-1"
              onClick={() =>
                navigate(
                  activeType
                    ? `/templates/create?type=${encodeURIComponent(activeType)}`
                    : '/templates/create',
                  { state: { returnTo } },
                )
              }
            >
              <CIcon icon={cilPlus} />
              Create Proposal Template
            </CButton>
          </DataTableCardHeader>
          <CCardBody className="records-page-card-body">
            {error && (
              <CAlert color="danger" className="mb-3">
                Failed: {error}
              </CAlert>
            )}
            {renderTable()}
          </CCardBody>
        </CCard>
        <SpecialCategoryManager
          visible={showCategoryManager}
          onClose={() => setShowCategoryManager(false)}
          onChanged={refreshData}
        />
      </CCol>
    </CRow>
  )
}

export default ProposalsPage
