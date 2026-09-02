// src/templates/create/SpecialTemplate/SpecialTemplate.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CForm,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormSelect,
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
import SpecialCategoryManager from '../../shared/SpecialCategoryManager'
import { listSpecialCategories } from '../../shared/specialCategoryApi'
import { useAuth } from '../../../../auth/AuthProvider'
import { hasAnyAllowedRole } from '../../../../utils/roles'
import dialog from '../../../../components/dialog/dialogService'
import TemplateDraftNotice from '../../shared/TemplateDraftNotice'
import TemplateFieldLabel from '../../shared/TemplateFieldLabel'
import TemplateFormActions from '../../shared/TemplateFormActions'
import TemplateSectionHeader from '../../shared/TemplateSectionHeader'
import { useTemplateDirtyState } from '../../shared/templateFormUi'

export default function SpecialTemplate({
  isEdit,
  editId,
  onDirtyChange,
  specialCategoryId = null,
}) {
  const { user } = useAuth()
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
    validationErrors,
    setValidationErrors,
    draftRestored,
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
    handleReset: resetForm,
    handleCancel: navigateCancel,
  } = useFormLogic({ isEdit, editId, initialCategoryId: specialCategoryId })

  const [showHelp, setShowHelp] = useState(false)
  const [categories, setCategories] = useState([])
  const [categoryError, setCategoryError] = useState('')
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const canManageCategories = hasAnyAllowedRole(user?.roles, ['Manager', 'System Admin'])
  const loadCategories = useCallback(async () => {
    setCategoryError('')
    try {
      const payload = await listSpecialCategories()
      setCategories(Array.isArray(payload?.data) ? payload.data : [])
    } catch (err) {
      setCategoryError(err?.message || 'Failed to load service categories.')
    }
  }, [])
  useEffect(() => {
    loadCategories()
  }, [loadCategories])
  const categoryOptions = useMemo(() => {
    const options = [...categories]
    if (
      template.categoryId &&
      !options.some((category) => String(category.id) === String(template.categoryId))
    ) {
      options.push({
        id: template.categoryId,
        name: template.categoryName || 'Inactive category',
        isActive: false,
      })
    }
    return options
  }, [categories, template.categoryId, template.categoryName])
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

  const isDirty = useTemplateDirtyState(
    {
      template,
      remarks,
      existingAttachmentIds: existingAttachments.map((attachment) => attachment.id),
      newAttachmentNames: newAttachments.map((attachment) => attachment.file?.name),
    },
    onDirtyChange,
    !loading,
  )

  async function handleCancel() {
    if (isDirty) {
      const confirmed = await dialog.confirm('Discard these unsaved template changes?')
      if (!confirmed) return
    }
    navigateCancel()
  }

  async function handleReset() {
    if (isDirty) {
      const confirmed = await dialog.confirm(
        'Reset this proposal form and permanently clear its local draft and selected files?',
      )
      if (!confirmed) return
    }
    resetForm()
  }

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
        <TemplateDraftNotice restored={draftRestored} includesFiles={false} />
        {/* Warning banner */}
        <CRow className="mb-3">
          <CCol>
            <CAlert color="info" className="py-2 mb-0">
              Use Other Services for custom work that does not fit Training, Industrial Hygiene, or
              Manpower Supply.
            </CAlert>
          </CCol>
        </CRow>

        <TemplateSectionHeader
          title="Basic details"
          description="Classify and name the reusable service before adding its proposal content."
        />
        <CRow className="mb-3">
          <CCol md={8}>
            <TemplateFieldLabel htmlFor="special-service-category">
              Service category
            </TemplateFieldLabel>
            <CFormSelect
              id="special-service-category"
              name="categoryId"
              value={template.categoryId || ''}
              onChange={handleInputChange}
              invalid={Boolean(categoryError || validationErrors.categoryId)}
              aria-invalid={Boolean(categoryError || validationErrors.categoryId) || undefined}
              feedbackInvalid={validationErrors.categoryId}
              data-template-field="categoryId"
              disabled={!isEdit && Boolean(specialCategoryId)}
            >
              <option value="">Select a category</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.isActive === false ? ' (Inactive)' : ''}
                </option>
              ))}
            </CFormSelect>
            {categoryError && (
              <small className="text-danger d-block mt-1">
                {categoryError}{' '}
                <button type="button" className="btn btn-link btn-sm p-0" onClick={loadCategories}>
                  Retry
                </button>
              </small>
            )}
            {canManageCategories && (
              <CButton
                color="link"
                size="sm"
                className="px-0 mt-1"
                onClick={() => setShowCategoryManager(true)}
              >
                Can&apos;t find the category? Manage categories
              </CButton>
            )}
          </CCol>
        </CRow>

        {/* Title & Code */}
        <CRow className="mb-3">
          <CCol md={12}>
            <TemplateFieldLabel>Customer-facing proposal</TemplateFieldLabel>
            <div className="small text-muted mb-2">
              Choose how this proposal will be included when staff prepare a quotation.
            </div>
            <div className="d-flex gap-4 mt-1">
              <CFormCheck
                type="radio"
                name="proposalMode"
                id="special-proposal-mode-upload"
                value="upload"
                label="Upload proposal PDF"
                checked={proposalMode === 'upload'}
                onChange={handleInputChange}
              />
              <CFormCheck
                type="radio"
                name="proposalMode"
                id="special-proposal-mode-write"
                value="write"
                label="Write proposal here"
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
            <TemplateFieldLabel htmlFor="special-service-title">Service title</TemplateFieldLabel>
            <CFormInput
              id="special-service-title"
              name="serviceTitle"
              value={template.serviceTitle}
              onChange={handleInputChange}
              placeholder="E.g., Working at Height Consultancy"
              invalid={Boolean(validationErrors.serviceTitle)}
              aria-invalid={Boolean(validationErrors.serviceTitle) || undefined}
              feedbackInvalid={validationErrors.serviceTitle}
              data-template-field="serviceTitle"
            />
          </CCol>
          <CCol md={3}>
            <TemplateFieldLabel htmlFor="special-service-code">Service code</TemplateFieldLabel>
            <CFormInput
              id="special-service-code"
              name="serviceCode"
              value={template.serviceCode}
              onChange={handleInputChange}
              placeholder="E.g., WAHCON"
              invalid={Boolean(validationErrors.serviceCode)}
              aria-invalid={Boolean(validationErrors.serviceCode) || undefined}
              feedbackInvalid={validationErrors.serviceCode}
              data-template-field="serviceCode"
            />
          </CCol>
        </CRow>

        <TemplateSectionHeader
          title="Proposal content"
          description={
            isUploadMode
              ? 'Add an internal summary and upload the customer-facing PDF below.'
              : 'Write the customer-facing proposal that will be included with the quotation.'
          }
        />
        {/* Rich Content Editor */}
        <CRow className="mb-3">
          <CFormLabel className="fw-semibold">
            {isUploadMode ? 'Internal Service Summary' : 'Proposal Contents'}
            <span className={isUploadMode ? 'text-muted fw-normal' : 'text-danger'}>
              {isUploadMode ? ' — Optional' : ' *'}
            </span>
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
            invalid={Boolean(validationErrors.proposalContent)}
            feedbackInvalid={validationErrors.proposalContent}
            height={isUploadMode ? 260 : 600}
            init={{
              placeholder: isUploadMode
                ? 'Internal summary only: describe scope/context for staff reference. This text is not included in the final proposal PDF.'
                : 'Write the full customer-facing proposal content here. This content will be rendered in the final proposal PDF.',
            }}
          />
        </CRow>

        <TemplateSectionHeader
          title="Quote defaults"
          description="Optional line items can pre-fill a quotation when staff select this template."
        />
        <CRow className="mb-3">
          <CCol>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <CFormLabel className="mb-0">
                Default quotation line items <span className="text-muted">— Optional</span>
              </CFormLabel>
              <CButton
                color="primary"
                variant="outline"
                size="sm"
                onClick={handleAddDefaultLineItem}
              >
                {defaultLineItems.length === 0 ? 'Add first line item' : 'Add line item'}
              </CButton>
            </div>
            {defaultLineItems.length > 0 && (
              <div className="records-table-shell quote-line-items-table-shell overflow-auto">
                <div className="small text-muted d-md-none px-2 pt-2">
                  Scroll horizontally to edit all line-item fields.
                </div>
                <CTable
                  hover
                  className="align-middle mb-0 records-table-compact"
                  style={{ minWidth: '980px' }}
                >
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
                            invalid={Boolean(validationErrors[`defaultLineItems.${index}.title`])}
                            aria-invalid={
                              Boolean(validationErrors[`defaultLineItems.${index}.title`]) ||
                              undefined
                            }
                            data-template-field={`defaultLineItems.${index}.title`}
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
                            invalid={Boolean(
                              validationErrors[`defaultLineItems.${index}.quantity`],
                            )}
                            aria-invalid={
                              Boolean(validationErrors[`defaultLineItems.${index}.quantity`]) ||
                              undefined
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
                            invalid={Boolean(
                              validationErrors[`defaultLineItems.${index}.unitPrice`],
                            )}
                            aria-invalid={
                              Boolean(validationErrors[`defaultLineItems.${index}.unitPrice`]) ||
                              undefined
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
                  </CTableBody>
                </CTable>
              </div>
            )}
          </CCol>
        </CRow>

        {/* Attachments */}
        {isUploadMode && (
          <>
            <TemplateSectionHeader
              title="Supporting proposal"
              description="Upload at least one customer-facing PDF. Each file can be up to 10 MB."
            />
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
              validationError={validationErrors.attachments}
            />
          </>
        )}

        {/* Remarks */}
        <RemarksSection
          isEdit={isEdit}
          history={history}
          remarks={remarks}
          setRemarks={setRemarks}
          invalid={Boolean(validationErrors.remarks)}
          feedbackInvalid={validationErrors.remarks}
          onChange={() => setValidationErrors((current) => ({ ...current, remarks: undefined }))}
        />

        {/* Actions */}
        <TemplateFormActions
          isEdit={isEdit}
          saving={saving}
          finalizingBmTranslation={finalizingBmTranslation}
          onSecondary={handleSecondaryAction}
          onSave={handleSave}
          draftMessage={
            isEdit
              ? 'A new internal change note is required.'
              : 'Draft text is saved locally. Selected files are not saved.'
          }
        />
      </CForm>
      <SpecialCategoryManager
        visible={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        onChanged={loadCategories}
      />

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
