import React from 'react'
import EditorInput from '../../components/EditorInput'
import MethodologySection from './MethodologySection'

const MainBody = ({ templateDetails, setTemplateDetails, handleEditorChange }) => (
  <>
    <EditorInput
      label="Introduction"
      value={templateDetails.introduction}
      onChange={handleEditorChange}
      field="introduction"
    />

    <EditorInput
      label="Objectives"
      value={templateDetails.objectives}
      onChange={handleEditorChange}
      field="objectives"
    />

    <EditorInput
      label="Modules"
      value={templateDetails.modules}
      onChange={handleEditorChange}
      field="modules"
    />

    <MethodologySection templateDetails={templateDetails} setTemplateDetails={setTemplateDetails} />
  </>
)

export default MainBody
