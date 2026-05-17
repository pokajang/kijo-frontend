import React from 'react'
import TemplateFormStatus from '../../shared/TemplateFormStatus'
import Form from './Form'
import useFormLogic from './useFormLogic'

const IhProposalPage = ({ isEdit, editId }) => {
  const {
    templateDetails,
    templateMeta,
    finalizingBmTranslation,
    setTemplateDetails,
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
      setTemplateDetails={setTemplateDetails}
      remarks={remarks}
      setRemarks={setRemarks}
      history={history}
      saving={saving}
      saveError={saveError}
      setSaveError={setSaveError}
      handleInputChange={handleInputChange}
      handleEditorChange={handleEditorChange}
      handleSave={handleSave}
      handleReset={handleReset}
      handleCancel={handleCancel}
    />
  )
}

export default IhProposalPage
