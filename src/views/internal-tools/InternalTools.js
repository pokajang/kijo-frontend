import React from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'

const toolGroups = [
  {
    title: 'PDF Tools',
    description: 'Edit, delete, rearrange pages, or convert PDF files.',
    tools: [
      { label: 'ILovePDF', color: 'danger', href: 'https://www.ilovepdf.com' },
      { label: 'Sejda', color: 'success', href: 'https://www.sejda.com/' },
      {
        label: 'Adobe',
        color: 'warning',
        href: 'https://www.adobe.com/acrobat/online/pdf-editor.html',
      },
    ],
  },
  {
    title: 'Background Remover',
    description: 'Remove image backgrounds for quick document and presentation edits.',
    tools: [
      {
        label: 'Adobe',
        color: 'warning',
        href: 'https://www.adobe.com/express/feature/image/remove-background',
      },
      {
        label: 'Photoroom',
        color: 'dark',
        href: 'https://www.photoroom.com/tools/background-remover',
      },
      { label: 'remove.bg', color: 'light', href: 'https://www.remove.bg/' },
    ],
  },
  {
    title: 'File Converters',
    description: 'Convert files between common document, image, and media formats.',
    tools: [
      { label: 'FreeConvert', color: 'primary', href: 'https://www.freeconvert.com/' },
      { label: 'Convertio', color: 'warning', href: 'https://convertio.co/' },
      { label: 'CloudConvert', color: 'dark', href: 'https://cloudconvert.com/' },
    ],
  },
]

const InternalTools = () => (
  <CRow>
    {toolGroups.map((group) => (
      <CCol md={4} key={group.title}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>{group.title}</strong>
          </CCardHeader>
          <CCardBody>
            <p>{group.description}</p>
            <div className="d-flex gap-2 flex-wrap">
              {group.tools.map((tool) => (
                <CButton
                  key={tool.href}
                  size="sm"
                  color={tool.color}
                  href={tool.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tool.label}
                </CButton>
              ))}
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    ))}
  </CRow>
)

export default InternalTools
