// src/templates/create/SpecialTemplate/SpecialTemplate.jsx
import React, { useState } from 'react'
import {
  CForm,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormCheck,
  CButton,
  CAlert,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilInfo } from '@coreui/icons'
import useFormLogic from './useFormLogic'
import EditorInput from '../../components/EditorInput'
import BmDraftReviewNotice from '../../shared/BmDraftReviewNotice'
import TemplateFormStatus from '../../shared/TemplateFormStatus'
import RemarksSection from './RemarksSection'
import HowToWriteModal from './HowToWriteModal'
import UploadAttachment from './UploadAttachment'
import ViewSingleFileModal from './ViewSingleFileModal'

export default function SpecialTemplate({ isEdit, editId }) {
  const {
    template,
    templateMeta,
    finalizingBmTranslation,
    existingAttachments,
    newAttachments,
    rejectedAttachments,
    remarks,
    setRemarks,
    history,
    loading,
    loadError,
    saving,
    saveError,
    setSaveError,
    handleInputChange,
    handleEditorChange,
    handleAddDefaultLineItem,
    handleDefaultLineItemChange,
    handleRemoveDefaultLineItem,
    handleNewFileChange,
    handleRenameFile,
    handleRemoveNewAttachment,
    setRejectedAttachments,
    removeExistingAttachment,
    handleSave,
    handleReset,
    handleCancel,
  } = useFormLogic({ isEdit, editId })

  const [showHelp, setShowHelp] = useState(false)
  const proposalMode = template.proposalMode || 'upload'
  const isUploadMode = proposalMode === 'upload'
  const defaultLineItems = Array.isArray(template.defaultLineItems) ? template.defaultLineItems : []

  // Single-file preview state
  const [showFilePreview, setShowFilePreview] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)

  const handlePreview = (fileObj) => {
    setPreviewFile(fileObj)
    setShowFilePreview(true)
  }

  const handleSecondaryAction = isEdit ? handleCancel : handleReset

  if (loading) {
    return <TemplateFormStatus loading={loading} />
  }

  if (loadError) {
    return <TemplateFormStatus loadError={loadError} />
  }

  return (
    <>
      <CForm>
        <TemplateFormStatus saveError={saveError} onClearSaveError={() => setSaveError('')} />
        <BmDraftReviewNotice record={templateMeta} />
        {/* Warning banner */}
        <CRow className="mb-3">
          <CCol>
            <CAlert color="danger" dismissible>
              Note: Use this section for any services that <strong>fall outside</strong> our
              standard offerings or require significant customization. Place any highly custom
              proposals here.
            </CAlert>
          </CCol>
        </CRow>

        {/* Title & Code */}
        <CRow className="mb-3">
          <CCol md={12}>
            <CFormLabel>Proposal Mode</CFormLabel>
            <div className="d-flex gap-4 mt-1">
              <CFormCheck
                type="radio"
                name="proposalMode"
                id="special-proposal-mode-upload"
                value="upload"
                label="Upload Full Proposal"
                checked={proposalMode === 'upload'}
                onChange={handleInputChange}
              />
              <CFormCheck
                type="radio"
                name="proposalMode"
                id="special-proposal-mode-write"
                value="write"
                label="Write Proposal"
                checked={proposalMode === 'write'}
                onChange={handleInputChange}
              />
            </div>
            <small className="text-muted d-block mt-2">
              {isUploadMode
                ? 'The uploaded PDF will be appended to the generated quotation PDF.'
                : 'The written proposal content will be rendered and appended to the generated quotation PDF.'}
            </small>
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol md={9}>
            <CFormLabel>Special Service Title</CFormLabel>
            <CFormInput
              name="serviceTitle"
              value={template.serviceTitle}
              onChange={handleInputChange}
              placeholder="E.g., Working at Height Consultancy"
            />
          </CCol>
          <CCol md={3}>
            <CFormLabel>Service Code</CFormLabel>
            <CFormInput
              name="serviceCode"
              value={template.serviceCode}
              onChange={handleInputChange}
              placeholder="E.g., WAHCON"
            />
          </CCol>
        </CRow>

        {/* Rich Content Editor */}
        <CRow className="mb-3">
          <CFormLabel>
            {isUploadMode ? 'Internal Service Summary' : 'Proposal Contents'}
            {!isUploadMode && (
              <>
                &nbsp;
                <CIcon
                  icon={cilInfo}
                  size="lg"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShowHelp(true)}
                />
              </>
            )}
          </CFormLabel>
          <EditorInput
            key={proposalMode}
            label={null}
            field={isUploadMode ? 'serviceSummary' : 'proposalContent'}
            value={isUploadMode ? template.serviceSummary || '' : template.proposalContent || ''}
            onChange={handleEditorChange}
            height={isUploadMode ? 260 : 600}
            init={{
              placeholder: isUploadMode
                ? 'Internal summary only: describe scope/context for staff reference. This text is not included in the final proposal PDF.'
                : 'Write the full customer-facing proposal content here. This content will be rendered in the final proposal PDF.',
            }}
          />
        </CRow>

        <CRow className="mb-3">
          <CCol>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <CFormLabel className="mb-0">Default Quotation Line Items</CFormLabel>
              <CButton
                color="primary"
                variant="outline"
                size="sm"
                onClick={handleAddDefaultLineItem}
              >
                Add Line Item
              </CButton>
            </div>
            <div className="records-table-shell quote-line-items-table-shell overflow-hidden">
              <CTable hover className="align-middle mb-0 records-table-compact">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell style={{ width: '48px' }}>#</CTableHeaderCell>
                    <CTableHeaderCell>Item Title</CTableHeaderCell>
                    <CTableHeaderCell>Description</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '130px' }}>Unit</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '110px' }}>Qty</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '140px' }}>Unit Price</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '120px' }}>Amount</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '80px' }} />
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {defaultLineItems.map((item, index) => (
                    <CTableRow key={index}>
                      <CTableDataCell>{index + 1}</CTableDataCell>
                      <CTableDataCell>
                        <CFormInput
                          value={item.title || ''}
                          onChange={(event) =>
                            handleDefaultLineItemChange(index, 'title', event.target.value)
                          }
                        />
                      </CTableDataCell>
                      <CTableDataCell>
                        <CFormInput
                          value={item.description || ''}
                          onChange={(event) =>
                            handleDefaultLineItemChange(index, 'description', event.target.value)
                          }
                        />
                      </CTableDataCell>
                      <CTableDataCell>
                        <CFormInput
                          value={item.unit || ''}
                          onChange={(event) =>
                            handleDefaultLineItemChange(index, 'unit', event.target.value)
                          }
                        />
                      </CTableDataCell>
                      <CTableDataCell>
                        <CFormInput
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity ?? 1}
                          onChange={(event) =>
                            handleDefaultLineItemChange(index, 'quantity', event.target.value)
                          }
                        />
                      </CTableDataCell>
                      <CTableDataCell>
                        <CFormInput
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice ?? 0}
                          onChange={(event) =>
                            handleDefaultLineItemChange(index, 'unitPrice', event.target.value)
                          }
                        />
                      </CTableDataCell>
                      <CTableDataCell>
                        <CFormInput readOnly value={Number(item.amount || 0).toFixed(2)} />
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        <CButton
                          color="danger"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveDefaultLineItem(index)}
                        >
                          Remove
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  {defaultLineItems.length === 0 && (
                    <CTableRow>
                      <CTableDataCell colSpan={8} className="text-muted">
                        No default line items. Quotes can still add line items manually.
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </div>
          </CCol>
        </CRow>

        {/* Attachments */}
        {isUploadMode && (
          <>
            {finalizingBmTranslation && existingAttachments.length > 0 && (
              <CAlert color="warning" className="mb-3">
                <strong>Review copied attachments before finalizing this BM proposal.</strong>
                <div className="mt-1">
                  These files were copied from the English proposal. Open each attachment and
                  replace or remove anything that is not suitable for the BM version.
                </div>
              </CAlert>
            )}
            <UploadAttachment
              isEdit={isEdit}
              existingAttachments={existingAttachments}
              newAttachments={newAttachments}
              rejectedAttachments={rejectedAttachments}
              onNewFileChange={handleNewFileChange}
              onRenameFile={handleRenameFile}
              onRemoveNewAttachment={handleRemoveNewAttachment}
              onRemoveExistingAttachment={removeExistingAttachment}
              onPreviewFile={handlePreview}
              onClearRejected={() => setRejectedAttachments([])}
            />
          </>
        )}

        {/* Remarks */}
        <RemarksSection
          isEdit={isEdit}
          history={history}
          remarks={remarks}
          setRemarks={setRemarks}
        />

        {/* Actions */}
        <CRow className="mt-4">
          <CCol className="d-flex justify-content-end gap-2">
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={handleSecondaryAction}
              disabled={saving}
            >
              {isEdit ? 'Cancel' : 'Reset'}
            </CButton>
            <CButton color="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving
                ? finalizingBmTranslation
                  ? 'Saving BM Proposal...'
                  : isUploadMode
                    ? 'Uploading...'
                    : isEdit
                      ? 'Updating...'
                      : 'Saving...'
                : finalizingBmTranslation
                  ? 'Save BM Proposal'
                  : isEdit
                    ? 'Update Changes'
                    : 'Create'}
            </CButton>
          </CCol>
        </CRow>
      </CForm>

      {/* Help Modal */}
      <HowToWriteModal visible={showHelp} onClose={() => setShowHelp(false)} />

      {/* Single File Preview Modal */}
      <ViewSingleFileModal
        visible={showFilePreview}
        file={previewFile}
        onClose={() => setShowFilePreview(false)}
      />
    </>
  )
}
