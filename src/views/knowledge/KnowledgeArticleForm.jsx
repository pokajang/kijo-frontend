import React from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormLabel,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import { DataTableLoadingState } from '../../components/datatable'
import KnowledgeArticleStatusAlerts from './components/KnowledgeArticleStatusAlerts'
import KnowledgeArticleEditorFields from './form/KnowledgeArticleEditorFields'
import KnowledgeArticleFormActions from './form/KnowledgeArticleFormActions'
import KnowledgeArticleImageManager from './form/KnowledgeArticleImageManager'
import useKnowledgeArticleForm from './form/useKnowledgeArticleForm'

const KnowledgeArticleForm = ({ mode = 'create' }) => {
  const formState = useKnowledgeArticleForm({ mode })
  const {
    addImages,
    draftNotice,
    editRemarksMissing,
    error,
    form,
    handlePaste,
    isArchived,
    isEditing,
    loading,
    navigate,
    processingImages,
    removeExistingImage,
    removeNewImage,
    saveArticle,
    saving,
    setDraftNotice,
    updateExistingImageDescription,
    updateField,
    updateNewImageDescription,
  } = formState

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <strong>{isEditing ? 'Edit Knowledge Article' : 'Create Knowledge Article'}</strong>
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={() => navigate('/knowledge')}
            >
              Knowledge Hub
            </CButton>
          </CCardHeader>
          <CCardBody onPaste={handlePaste}>
            <KnowledgeArticleStatusAlerts
              error={error}
              draftNotice={draftNotice}
              onDismissDraftNotice={() => setDraftNotice('')}
            />
            {loading ? (
              <DataTableLoadingState message="Loading article..." />
            ) : (
              <>
                <KnowledgeArticleEditorFields form={form} updateField={updateField} />
                <KnowledgeArticleImageManager
                  addImages={addImages}
                  form={form}
                  isArchived={isArchived}
                  processingImages={processingImages}
                  removeExistingImage={removeExistingImage}
                  removeNewImage={removeNewImage}
                  updateExistingImageDescription={updateExistingImageDescription}
                  updateNewImageDescription={updateNewImageDescription}
                />
                {isEditing && (
                  <div className="mb-3">
                    <CFormLabel>Edit Remarks</CFormLabel>
                    <CFormTextarea
                      rows={2}
                      value={form.edit_remarks}
                      placeholder="Briefly note what changed or why this article was updated."
                      onChange={(event) => updateField('edit_remarks', event.target.value)}
                    />
                  </div>
                )}
                <KnowledgeArticleFormActions
                  editRemarksMissing={editRemarksMissing}
                  isArchived={isArchived}
                  navigate={navigate}
                  processingImages={processingImages}
                  saveArticle={saveArticle}
                  saving={saving}
                />
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default KnowledgeArticleForm
