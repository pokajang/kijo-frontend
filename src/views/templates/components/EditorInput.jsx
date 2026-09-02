// src/templates/components/EditorInput.jsx
import React from 'react'
import { CRow, CCol } from '@coreui/react'
import Editor from '../../../components/forms/ThemedTinyMCEEditor'

/**
 * A reusable TinyMCE editor input component with heading support.
 */
const EditorInput = ({
  label,
  required = false,
  optional = false,
  field,
  value,
  onChange,
  invalid = false,
  feedbackInvalid = '',
  /* default plugins for headings, lists, links, tables, code view */
  plugins = 'advlist lists link table code',
  /* default toolbar layout including formatselect */
  toolbar = 'undo redo | formatselect | bold italic underline | bullist numlist | alignleft aligncenter alignright alignjustify | link table | code',
  /* allow per-instance overrides */
  init = {},
  /* editor height */
  height = 250,
}) => (
  <CRow className="mb-3">
    <CCol md={12}>
      {label && (
        <label className="form-label">
          {label}
          {(required || optional) && (
            <span className={optional ? 'text-muted fw-normal' : 'text-danger'}>
              {optional ? ' — Optional' : ' *'}
            </span>
          )}
        </label>
      )}
      <div
        className={invalid ? 'border border-danger rounded p-1' : ''}
        data-template-field={field || undefined}
        tabIndex={invalid ? -1 : undefined}
        aria-invalid={invalid || undefined}
      >
        <Editor
          tinymceScriptSrc="/tinymce/tinymce.min.js"
          value={value}
          init={{
            license_key: 'gpl',
            height,
            menubar: 'format', // keep format menu for headings
            branding: false, // hide TinyMCE branding
            promotion: false,
            toolbar_mode: 'wrap', // wrap toolbar lines
            block_formats:
              'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Heading 6=h6; Preformatted=pre',
            plugins,
            toolbar,
            ...init,
          }}
          onEditorChange={(content) => onChange(content, field)}
        />
      </div>
      {invalid && feedbackInvalid && (
        <div className="invalid-feedback d-block">{feedbackInvalid}</div>
      )}
    </CCol>
  </CRow>
)

export default EditorInput
