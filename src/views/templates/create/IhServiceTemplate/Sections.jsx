// src/views/template/Sections.jsx
import React from 'react'
import EditorInput from '../../components/EditorInput'
import TemplateOptionalEditors from '../../shared/TemplateOptionalEditors'

/**
 * Renders all proposal sections with TinyMCE editor inputs.
 */
const Sections = ({ templateDetails, handleEditorChange, validationErrors = {} }) => {
  // basic list plugin + heading dropdown for common fields
  const commonPlugins = 'lists'
  const commonToolbar =
    'undo redo | formatselect | bold italic | bullist numlist | alignleft aligncenter alignright'

  return (
    <>
      <EditorInput
        label="Introduction"
        required
        field="introduction"
        value={templateDetails.introduction}
        onChange={handleEditorChange}
        invalid={Boolean(validationErrors.introduction)}
        feedbackInvalid={validationErrors.introduction}
      />

      <TemplateOptionalEditors
        onChange={handleEditorChange}
        items={[
          { label: 'Objectives', field: 'objectives', value: templateDetails.objectives },
          { label: 'Scope of work', field: 'workScope', value: templateDetails.workScope },
          { label: 'Project schedule', field: 'schedule', value: templateDetails.schedule },
          { label: 'References', field: 'reference', value: templateDetails.reference },
          { label: 'Custom sections', field: 'otherFields', value: templateDetails.otherFields },
        ]}
      />
    </>
  )
}

export default Sections
