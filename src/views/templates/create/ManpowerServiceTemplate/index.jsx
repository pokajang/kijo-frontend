import React from 'react'
import TemplateFormStatus from '../../shared/TemplateFormStatus'
import Form from './Form'
import useFormLogic from './useFormLogic'

/**
 * Wrapper for the Manpower Service Template form.
 * Receives isEdit & editId from CreateTemplate.js and passes
 * all necessary props—including remarks/history—into <Form>.
 */
const ManpowerServiceTemplate = ({ isEdit, editId }) => {
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
    handleEditorChange,
    handleSave,
    handleReset,
    handleCancel,
  } = useFormLogic({ isEdit, editId })

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
      remarks={remarks}
      setRemarks={setRemarks}
      history={history}
      saving={saving}
      saveError={saveError}
      setSaveError={setSaveError}
      handleSave={handleSave}
      handleReset={handleReset}
      handleCancel={handleCancel}
    />
  )
}

export default ManpowerServiceTemplate
