import React from 'react'
import { NavLink } from 'react-router-dom'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'

const toolSections = [
  {
    title: 'Assessments',
    groups: [
      {
        title: 'Legal Compliance Assessment',
        description: 'Complete a starter OSH legal compliance form and review the report draft.',
        tools: [
          {
            label: 'Start',
            color: 'primary',
            to: '/internal-tools/legal-compliance',
          },
        ],
      },
    ],
  },
  {
    title: 'Utilities',
    groups: [
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
    ],
  },
]

const InternalTools = () => (
  <>
    {toolSections.map((section) => (
      <div className="mb-4" key={section.title}>
        <div className="small text-body-secondary mb-2">{section.title}</div>
        <CRow className="g-4">
          {section.groups.map((group) => (
            <CCol lg={3} md={6} key={group.title}>
              <CCard className="h-100">
                <CCardHeader>
                  <strong>{group.title}</strong>
                </CCardHeader>
                <CCardBody>
                  <p>{group.description}</p>
                  <div className="d-flex gap-2 flex-wrap">
                    {group.tools.map((tool) => (
                      <CButton
                        key={tool.href || tool.to}
                        size="sm"
                        color={tool.color}
                        {...(tool.to
                          ? { as: NavLink, to: tool.to }
                          : { href: tool.href, target: '_blank', rel: 'noopener noreferrer' })}
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
      </div>
    ))}
  </>
)

export default InternalTools
