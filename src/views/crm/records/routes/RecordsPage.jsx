import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CButton, CCard, CCardBody, CCol, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
import { DataTableCardHeader, DataTableStatsToggle } from '../../../../components/datatable'
import RecordsServiceStrip from '../../../../components/records/RecordsServiceStrip.jsx'
import { useDataTableStatsVisibility } from '../../../../hooks/datatable'
import { getQuoteServiceFromRecordTab } from '../config/recordTabs.js'
import { useRecordsController } from '../hooks/useRecordsController'
import EmailSendConfirmModal from '../modals/shared/EmailSendConfirmModal.jsx'
import NegotiationRequestModal from '../modals/shared/NegotiationRequestModal.jsx'

const RecordsPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    activeTab,
    handleTabChange,
    recordTabOptions,
    ActiveTableComponent,
    tableProps,
    FailModal,
    SuccessModal,
    FollowUpModalComponent,
    modalState,
    dispatchModal,
    handleFailConfirm,
    handleSuccessConfirm,
    handleFollowUpSubmit,
    currentUserName,
    currentUserEmail,
    currentUser,
    emailConfirmRecord,
    setEmailConfirmRecord,
    emailDraftSubject,
    setEmailDraftSubject,
    emailDraftBody,
    setEmailDraftBody,
    emailSendError,
    handleEmailPreviewPdf,
    handleEmailOpenGmailDraft,
    handleEmailConfirm,
    isEmailSending,
    isFailModalSubmitting,
    isSuccessModalSubmitting,
    isFollowUpModalSubmitting,
    successRecord,
    negotiationRecord,
    negotiationForm,
    setNegotiationFormValue,
    closeNegotiationModal,
    handleNegotiationSubmit,
    isNegotiationSubmitting,
  } = useRecordsController()
  const [headerScopeLabel, setHeaderScopeLabel] = useState('')
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('crm.records')
  const returnTo = `${location.pathname}${location.search}`
  const initialQuoteService = getQuoteServiceFromRecordTab(activeTab)
  const createQuotePath = initialQuoteService
    ? `/crm/quotes?service=${encodeURIComponent(initialQuoteService)}`
    : '/crm/quotes'

  const handleRecordsTabChange = (...args) => {
    setHeaderScopeLabel('')
    handleTabChange(...args)
  }

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <RecordsServiceStrip
            tabs={recordTabOptions}
            activeTab={activeTab}
            onTabChange={handleRecordsTabChange}
            ariaLabel="Quotation record groups"
          />
          <CCard className="mb-4 records-page-card">
            <DataTableCardHeader title="Quotes" scopeLabel={headerScopeLabel}>
              <DataTableStatsToggle
                visible={statsVisible}
                onToggle={toggleStatsVisible}
                controlsVisible={controlsVisible}
                onControlsToggle={toggleControlsVisible}
              />
              <CButton
                color="primary"
                size="sm"
                className="d-inline-flex align-items-center gap-1"
                onClick={() =>
                  navigate(createQuotePath, {
                    state: { returnTo, initialService: initialQuoteService || undefined },
                  })
                }
              >
                <CIcon icon={cilPlus} />
                Create Quotation
              </CButton>
            </DataTableCardHeader>
            <CCardBody className="records-page-card-body">
              <div>
                <ActiveTableComponent
                  {...tableProps}
                  statsVisible={statsVisible}
                  controlsVisible={controlsVisible}
                  onStatsScopeLabelChange={setHeaderScopeLabel}
                />
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        <FailModal
          visible={modalState.fail.visible}
          onCancel={() => {
            if (!isFailModalSubmitting) {
              dispatchModal({ type: 'CLOSE_FAIL' })
            }
          }}
          onConfirm={handleFailConfirm}
          value={modalState.fail.reason}
          onChange={(reason) => dispatchModal({ type: 'SET_FAIL_REASON', payload: reason })}
          isSubmitting={isFailModalSubmitting}
        />

        <SuccessModal
          visible={modalState.success.visible}
          onCancel={() => {
            if (!isSuccessModalSubmitting) {
              dispatchModal({ type: 'CLOSE_SUCCESS' })
            }
          }}
          onConfirm={handleSuccessConfirm}
          record={successRecord}
          currentUser={currentUser}
          value={modalState.success.reason}
          onChange={(reason) => dispatchModal({ type: 'SET_SUCCESS_REASON', payload: reason })}
          awardDate={modalState.success.awardDate}
          onAwardDateChange={(date) => dispatchModal({ type: 'SET_SUCCESS_DATE', payload: date })}
          description={modalState.success.description}
          onDescriptionChange={(desc) =>
            dispatchModal({ type: 'SET_SUCCESS_DESCRIPTION', payload: desc })
          }
          loaRefNo={modalState.success.clientLoaRefNo}
          onLoaChange={(loa) => dispatchModal({ type: 'SET_SUCCESS_LOA', payload: loa })}
          onEditQuotation={() => {
            const serviceKey =
              successRecord?.serviceTab || modalState.success.serviceKey || activeTab
            const svc = getQuoteServiceFromRecordTab(serviceKey)
            if (!svc || !modalState.success.recordId) return
            navigate(
              `/crm/quotes?service=${svc}&edit=true&quoteId=${modalState.success.recordId}`,
              {
                state: { returnTo: location.pathname + location.search },
              },
            )
          }}
          mode={modalState.success.actionType}
          isSubmitting={isSuccessModalSubmitting}
        />

        <FollowUpModalComponent
          visible={modalState.followUp.visible}
          onCancel={() => {
            if (!isFollowUpModalSubmitting) {
              dispatchModal({ type: 'CLOSE_FOLLOWUP' })
            }
          }}
          onConfirm={handleFollowUpSubmit}
          remarks={modalState.followUp.remarks}
          onRemarksChange={(remarks) =>
            dispatchModal({ type: 'SET_FOLLOWUP_REMARKS', payload: remarks })
          }
          followUpDate={modalState.followUp.date}
          onDateChange={(date) => dispatchModal({ type: 'SET_FOLLOWUP_DATE', payload: date })}
          isSubmitting={isFollowUpModalSubmitting}
        />

        <EmailSendConfirmModal
          visible={Boolean(emailConfirmRecord)}
          record={emailConfirmRecord}
          userName={currentUserName}
          userEmail={currentUserEmail}
          onCancel={() => setEmailConfirmRecord(null)}
          draftSubject={emailDraftSubject}
          onDraftSubjectChange={setEmailDraftSubject}
          draftBody={emailDraftBody}
          onDraftBodyChange={setEmailDraftBody}
          sendError={emailSendError}
          onPreviewPdf={handleEmailPreviewPdf}
          onOpenGmailDraft={handleEmailOpenGmailDraft}
          onConfirm={handleEmailConfirm}
          isSubmitting={isEmailSending}
        />

        <NegotiationRequestModal
          visible={Boolean(negotiationRecord)}
          record={negotiationRecord}
          form={negotiationForm}
          onChange={setNegotiationFormValue}
          onCancel={closeNegotiationModal}
          onConfirm={handleNegotiationSubmit}
          isSubmitting={isNegotiationSubmitting}
        />
      </CRow>
    </>
  )
}

export default RecordsPage
