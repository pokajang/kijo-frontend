// src/views/template/Sections.jsx
import React from 'react'
import EditorInput from '../../components/EditorInput'

/**
 * Renders all proposal sections with TinyMCE editor inputs.
 */
const Sections = ({ templateDetails, handleEditorChange }) => {
  // basic list plugin + heading dropdown for common fields
  const commonPlugins = 'lists'
  const commonToolbar =
    'undo redo | formatselect | bold italic | bullist numlist | alignleft aligncenter alignright'

  return (
    <>
      <EditorInput
        label="Introduction"
        field="introduction"
        value={templateDetails.introduction}
        onChange={handleEditorChange}
      />

      <EditorInput
        label="Objectives"
        field="objectives"
        value={templateDetails.objectives}
        onChange={handleEditorChange}
      />

      <EditorInput
        label="Scope of Work"
        field="workScope"
        value={templateDetails.workScope}
        onChange={handleEditorChange}
      />

      <EditorInput
        label="Project Schedule"
        field="schedule"
        value={templateDetails.schedule}
        onChange={handleEditorChange}
      />

      <EditorInput
        label="References"
        field="reference"
        value={templateDetails.reference}
        onChange={handleEditorChange}
      />

      {/* uses default plugins & toolbar (includes headings, tables, code view) */}
      <EditorInput
        label="Custom Sections"
        field="otherFields"
        value={templateDetails.otherFields}
        onChange={handleEditorChange}
      />
    </>
  )
}

export default Sections
