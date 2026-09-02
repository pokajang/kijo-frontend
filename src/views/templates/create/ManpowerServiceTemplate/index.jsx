import React from 'react'
import TemplateFormStatus from '../../shared/TemplateFormStatus'
import Form from './Form'
import useFormLogic from './useFormLogic'
import dialog from '../../../../components/dialog/dialogService'
import { useTemplateDirtyState } from '../../shared/templateFormUi'

/**
 * Wrapper for the Manpower Service Template form.
 * Receives isEdit & editId from CreateTemplate.js and passes
 * all necessary props—including remarks/history—into <Form>.
 */
const ManpowerServiceTemplate = ({ isEdit, editId, onDirtyChange }) => {
  const {
    templateDetails,
    templateMeta,
    finalizingBmTranslation,
    remarks,
    setRemarks,
    history,
    loading,
    loadError,
    saving,
    saveError,
    setSaveError,
    validationErrors,
    draftRestored,
    handleEditorChange,
    clearValidationError,
    handleSave,
    handleReset: resetForm,
    handleCancel: navigateCancel,
  } = useFormLogic({ isEdit, editId })

  const isDirty = useTemplateDirtyState({ templateDetails, remarks }, onDirtyChange, !loading)

  const handleCancel = async () => {
    if (isDirty) {
      const confirmed = await dialog.confirm('Discard these unsaved template changes?')
      if (!confirmed) return
    }
    navigateCancel()
  }

  const handleReset = async () => {
    if (isDirty) {
      const confirmed = await dialog.confirm(
        'Reset this proposal form and permanently clear its local draft?',
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
    <Form
      isEdit={isEdit}
      templateDetails={templateDetails}
      templateMeta={templateMeta}
      finalizingBmTranslation={finalizingBmTranslation}
      handleEditorChange={handleEditorChange}
      clearValidationError={clearValidationError}
      remarks={remarks}
      setRemarks={setRemarks}
      history={history}
      saving={saving}
      saveError={saveError}
      setSaveError={setSaveError}
      validationErrors={validationErrors}
      draftRestored={draftRestored}
      handleSave={handleSave}
      handleReset={handleReset}
      handleCancel={handleCancel}
    />
  )
}

export default ManpowerServiceTemplate
