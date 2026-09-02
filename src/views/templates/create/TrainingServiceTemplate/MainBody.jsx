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
      required
      invalid={Boolean(validationErrors.introduction)}
      feedbackInvalid={validationErrors.introduction}
      init={{ placeholder: 'Describe who the training is for and why it is needed.' }}
    />

    <EditorInput
      label="Objectives"
      value={templateDetails.objectives}
      onChange={handleEditorChange}
      field="objectives"
      required
      invalid={Boolean(validationErrors.objectives)}
      feedbackInvalid={validationErrors.objectives}
      init={{ placeholder: 'List what participants should be able to do after the training.' }}
    />

    <EditorInput
      label="Modules"
      optional
      value={templateDetails.modules}
      onChange={handleEditorChange}
      field="modules"
      init={{ placeholder: 'List the topics or modules covered by the training.' }}
    />

    <MethodologySection
      templateDetails={templateDetails}
      setTemplateDetails={setTemplateDetails}
      validationErrors={validationErrors}
    />
  </>
)

export default MainBody
