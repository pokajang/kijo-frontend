import React from 'react'
import { CCol, CFormInput, CFormLabel, CFormTextarea, CRow } from '@coreui/react'
import Editor from '../../../components/forms/ThemedTinyMCEEditor'
import { relatedRouteOptions } from '../constants'

const editorInit = {
  license_key: 'gpl',
  height: 420,
  menubar: 'format table',
  branding: false,
  promotion: false,
  toolbar_mode: 'wrap',
  block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4; Preformatted=pre',
  plugins: 'advlist lists link table code',
  toolbar:
    'undo redo | formatselect | bold italic underline | bullist numlist | alignleft aligncenter alignright | link table | code',
}

const KnowledgeArticleEditorFields = ({ form, updateField }) => (
  <>
    <CRow className="g-3 mb-3">
      <CCol lg={6}>
        <CFormLabel>Title</CFormLabel>
        <CFormInput
          value={form.title}
          onChange={(event) => updateField('title', event.target.value)}
        />
      </CCol>
      <CCol lg={3}>
        <CFormLabel>Tags</CFormLabel>
        <CFormInput
          value={form.tagsText}
          placeholder="leave, proposal, crm"
          onChange={(event) => updateField('tagsText', event.target.value)}
        />
      </CCol>
      <CCol lg={3}>
        <CFormLabel>Related Page</CFormLabel>
        <CFormInput
          list="knowledge-related-routes"
          value={form.related_route}
          placeholder="/my/leaves/apply"
          onChange={(event) => updateField('related_route', event.target.value)}
        />
        <datalist id="knowledge-related-routes">
          {relatedRouteOptions.map((option) => (
            <option key={option.path} value={option.path} label={option.label} />
          ))}
        </datalist>
      </CCol>
    </CRow>

    <div className="mb-3">
      <CFormLabel>Summary</CFormLabel>
      <CFormTextarea
        rows={2}
        value={form.summary}
        onChange={(event) => updateField('summary', event.target.value)}
      />
    </div>

    <div className="mb-3">
      <CFormLabel>Content</CFormLabel>
      <Editor
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        value={form.body_html}
        init={editorInit}
        onEditorChange={(value) => updateField('body_html', value)}
      />
    </div>
  </>
)

export default KnowledgeArticleEditorFields
