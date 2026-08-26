import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, CCard, CCardHeader, CCol, CRow } from '@coreui/react'
import { getDateOnly } from '../utils/recordFilters'
import ChangeToFailModal from '../modals/shared/ChangeToFailModal.jsx'
import ChangeToSuccessModal from '../modals/shared/ChangeToSuccessModal.jsx'
import EmailSendConfirmModal from '../modals/shared/EmailSendConfirmModal.jsx'
import FollowUpModal from '../modals/shared/FollowUpModal.jsx'
import LegacyQuotationCostModal from '../modals/shared/LegacyQuotationCostModal.jsx'
import QuotationPdfPreviewModal from '../modals/shared/QuotationPdfPreviewModal.jsx'
import RecordDetailsActions from '../details/RecordDetailsActions'
import RecordActivityDetails from '../details/RecordActivityDetails'
import RecordDetailsCard from '../details/RecordDetailsCard'
import RecordProposalInlineDetails from '../details/RecordProposalInlineDetails'
import RecordServiceDetails from '../details/service/RecordServiceDetails'
import { getStatusColor, useRecordDetailsData } from '../hooks/useRecordDetailsData'
import { useRecordDetailsActions } from '../hooks/useRecordDetailsActions'

const RecordDetailsPage = () => {
  const navigate = useNavigate()
  const {
    serviceTab,
    serviceConfig,
    returnTo,
    loading,
    record,
    error,
    loadRecord,
    amountDisplay,
    subject,
    quotationAgeDays,
    isAwarded,
  } = useRecordDetailsData()

  const {
    handlers,
    showFailModal,
    setShowFailModal,
    showSuccessModal,
    setShowSuccessModal,
    showFollowUpModal,
    setShowFollowUpModal,
    failureReason,
    setFailureReason,
    successReason,
    setSuccessReason,
    awardDate,
    setAwardDate,
    description,
    setDescription,
    clientLoaRefNo,
    setClientLoaRefNo,
    followUpRemarks,
    setFollowUpRemarks,
    followUpDate,
    setFollowUpDate,
    successActionType,
    currentUserName,
    currentUserEmail,
    currentUser,
    isFailSubmitting,
    isSuccessSubmitting,
    isFollowUpSubmitting,
    isSyncingClient,
    showEmailConfirmModal,
    setShowEmailConfirmModal,
    emailDraftSubject,
    setEmailDraftSubject,
    emailDraftBody,
    setEmailDraftBody,
    isEmailSending,
    emailSendError,
    handleFailConfirm,
    handleSuccessConfirm,
    handleFollowUpSubmit,
    handleFollowUp,
    handleChangeToFail,
    handleChangeToSuccess,
    handleReAward,
    handleUnAward,
    handleDelete,
    handleSyncClient,
    handleEmail,
    handleEmailPreviewPdf,
    handleEmailOpenGmailDraft,
    handleEmailConfirm,
    handleSharePdf,
    legacyPdfPrompt,
    closeLegacyPdfPrompt,
    handleLegacyPdfGenerate,
    handleLegacyPdfEdit,
    pdfPreviewRequest,
    closePdfPreview,
  } = useRecordDetailsActions({
    serviceTab,
    record,
    returnTo,
    loadRecord,
  })

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
            <h1 className="h6 mb-0">Quotation Details</h1>
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              onClick={() => navigate(returnTo)}
            >
              Back
            </CButton>
          </CCardHeader>
          <RecordDetailsCard
            loading={loading}
            error={error}
            serviceLabel={serviceConfig?.label}
            record={record}
            subject={subject}
            amountDisplay={amountDisplay}
            quotationAgeDays={quotationAgeDays}
            getDateOnly={getDateOnly}
            statusColor={getStatusColor}
          />
          {!loading && !error && record ? (
            <>
              <RecordServiceDetails
                serviceTab={serviceTab}
                record={record}
                getDateOnly={getDateOnly}
              />
              <RecordProposalInlineDetails record={record} />
              <RecordActivityDetails record={record} getDateOnly={getDateOnly} />
              <RecordDetailsActions
                handlers={handlers}
                record={record}
                isAwarded={isAwarded}
                isSyncingClient={isSyncingClient}
                onFollowUp={handleFollowUp}
                onSharePdf={handleSharePdf}
                onUnAward={handleUnAward}
                onReAward={handleReAward}
                onChangeToSuccess={handleChangeToSuccess}
                onChangeToFail={handleChangeToFail}
                onSyncClient={handleSyncClient}
                onDelete={handleDelete}
                onEmail={handleEmail}
              />
            </>
          ) : null}
        </CCard>
      </CCol>

      <ChangeToFailModal
        visible={showFailModal}
        onCancel={() => {
          if (!isFailSubmitting) setShowFailModal(false)
        }}
        onConfirm={handleFailConfirm}
        value={failureReason}
        onChange={setFailureReason}
        isSubmitting={isFailSubmitting}
      />

      <ChangeToSuccessModal
        visible={showSuccessModal}
        onCancel={() => {
          if (!isSuccessSubmitting) setShowSuccessModal(false)
        }}
        onConfirm={handleSuccessConfirm}
        record={record}
        currentUser={currentUser}
        value={successReason}
        onChange={setSuccessReason}
        awardDate={awardDate}
        onAwardDateChange={setAwardDate}
        description={description}
        onDescriptionChange={setDescription}
        loaRefNo={clientLoaRefNo}
        onLoaChange={setClientLoaRefNo}
        onEditQuotation={() => {
          const svc = serviceTab.replace('-tab', '')
          navigate(`/crm/quotes?service=${svc}&edit=true&quoteId=${record?.id}`, {
            state: { returnTo },
          })
        }}
        mode={successActionType}
        isSubmitting={isSuccessSubmitting}
      />

      <FollowUpModal
        visible={showFollowUpModal}
        onCancel={() => {
          if (!isFollowUpSubmitting) setShowFollowUpModal(false)
        }}
        onConfirm={handleFollowUpSubmit}
        remarks={followUpRemarks}
        onRemarksChange={setFollowUpRemarks}
        followUpDate={followUpDate}
        onDateChange={setFollowUpDate}
        isSubmitting={isFollowUpSubmitting}
      />

      <EmailSendConfirmModal
        visible={showEmailConfirmModal}
        record={record}
        userName={currentUserName}
        userEmail={currentUserEmail}
        onCancel={() => setShowEmailConfirmModal(false)}
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

      <LegacyQuotationCostModal
        visible={Boolean(legacyPdfPrompt)}
        mode={legacyPdfPrompt?.mode}
        record={legacyPdfPrompt?.record}
        onCancel={closeLegacyPdfPrompt}
        onEdit={handleLegacyPdfEdit}
        onGenerate={handleLegacyPdfGenerate}
      />

      <QuotationPdfPreviewModal
        visible={Boolean(pdfPreviewRequest)}
        request={pdfPreviewRequest}
        onClose={closePdfPreview}
      />
    </CRow>
  )
}

export default RecordDetailsPage
