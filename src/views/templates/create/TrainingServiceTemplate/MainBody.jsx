import React from 'react'
import EditorInput from '../../components/EditorInput'
import MethodologySection from './MethodologySection'

const MainBody = ({
  templateDetails,
  setTemplateDetails,
  handleEditorChange,
  validationErrors = {},
}) => (
  <>
    <EditorInput
      label="Introduction"
      value={templateDetails.introduction}
      onChange={handleEditorChange}
      field="introduction"
      invalid={Boolean(validationErrors.introduction)}
      feedbackInvalid={validationErrors.introduction}
    />

    <EditorInput
      label="Objectives"
      value={templateDetails.objectives}
      onChange={handleEditorChange}
      field="objectives"
      invalid={Boolean(validationErrors.objectives)}
      feedbackInvalid={validationErrors.objectives}
    />

    <EditorInput
      label="Modules"
      value={templateDetails.modules}
      onChange={handleEditorChange}
      field="modules"
    />

    <MethodologySection
      templateDetails={templateDetails}
      setTemplateDetails={setTemplateDetails}
      validationErrors={validationErrors}
    />
  </>
)

export default MainBody
