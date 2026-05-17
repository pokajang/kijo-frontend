import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
import RecordsServiceStrip from '../../../../components/records/RecordsServiceStrip.jsx'
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
    ViewModal,
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
    negotiationRecord,
    negotiationForm,
    setNegotiationFormValue,
    closeNegotiationModal,
    handleNegotiationSubmit,
    isNegotiationSubmitting,
  } = useRecordsController()
  const returnTo = `${location.pathname}${location.search}`
  const initialQuoteService = getQuoteServiceFromRecordTab(activeTab)
  const createQuotePath = initialQuoteService
    ? `/crm/quotes?service=${encodeURIComponent(initialQuoteService)}`
    : '/crm/quotes'

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <RecordsServiceStrip
            tabs={recordTabOptions}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            ariaLabel="Quotation record groups"
          />
          <CCard className="mb-4 records-page-card">
            <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap records-page-card-header">
              <strong>Quotes</strong>
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
            </CCardHeader>
            <CCardBody className="records-page-card-body">
              <div>
                <ActiveTableComponent {...tableProps} />
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        <ViewModal
          visible={modalState.view.visible}
          record={modalState.view.record}
          onClose={() => {
            dispatchModal({ type: 'CLOSE_VIEW' })
          }}
        />

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
