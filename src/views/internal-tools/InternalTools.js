import React from 'react'
import { NavLink } from 'react-router-dom'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilExternalLink } from '@coreui/icons'

const toolSections = [
  {
    title: 'Assessments',
    groups: [
      {
        title: 'Legal Compliance Assessment',
        description: 'Complete a starter OSH legal compliance form and review the report draft.',
        variant: 'primary',
        tools: [
          {
            label: 'Start Assessment',
            color: 'primary',
            to: '/internal-tools/legal-compliance/select-template',
          },
          {
            label: 'Records',
            color: 'secondary',
            variant: 'outline',
            to: '/internal-tools/legal-compliance/records',
          },
          {
            label: 'Manage Templates',
            color: 'secondary',
            variant: 'outline',
            to: '/internal-tools/legal-compliance/templates',
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
          { label: 'ILovePDF', href: 'https://www.ilovepdf.com' },
          { label: 'Sejda', href: 'https://www.sejda.com/' },
          {
            label: 'Adobe PDF',
            href: 'https://www.adobe.com/acrobat/online/pdf-editor.html',
          },
        ],
      },
      {
        title: 'Background Remover',
        description: 'Remove image backgrounds for quick document and presentation edits.',
        tools: [
          {
            label: 'Adobe Express',
            href: 'https://www.adobe.com/express/feature/image/remove-background',
          },
          {
            label: 'Photoroom',
            href: 'https://www.photoroom.com/tools/background-remover',
          },
          { label: 'remove.bg', href: 'https://www.remove.bg/' },
        ],
      },
      {
        title: 'File Converters',
        description: 'Convert files between common document, image, and media formats.',
        tools: [
          { label: 'FreeConvert', href: 'https://www.freeconvert.com/' },
          { label: 'Convertio', href: 'https://convertio.co/' },
          { label: 'CloudConvert', href: 'https://cloudconvert.com/' },
        ],
      },
    ],
  },
]

const getSectionColumnProps = (section, group) => {
  if (group.variant === 'primary') return { lg: 6, md: 8 }
  const groupCount = section.groups.length
  if (groupCount === 1) return { lg: 4, md: 6 }
  if (groupCount === 3) return { lg: 4, md: 6 }
  if (groupCount === 2) return { lg: 6, md: 6 }
  return { lg: 3, md: 6 }
}

const InternalTools = () => {
  const renderToolAction = (tool) => {
    const isExternal = Boolean(tool.href)

    return (
      <CButton
        key={tool.href || tool.to || tool.label}
        size="sm"
        color={tool.color || 'secondary'}
        variant={tool.variant || (isExternal ? 'outline' : undefined)}
        className={`internal-tools-action${isExternal ? ' internal-tools-action--external' : ''}`}
        {...(tool.to
          ? { as: NavLink, to: tool.to }
          : {
              href: tool.href,
              target: '_blank',
              rel: 'noopener noreferrer',
            })}
      >
        <span>{tool.label}</span>
        {isExternal && (
          <CIcon icon={cilExternalLink} size="sm" className="internal-tools-action-external-icon" />
        )}
      </CButton>
    )
  }

  return (
    <div className="internal-tools-page">
      <div className="internal-tools-page-header">
        <h4 className="mb-1">Internal Tools</h4>
        <div className="text-body-secondary">
          Quick access to internal workflows and external utility shortcuts.
        </div>
      </div>

      {toolSections.map((section) => (
        <section className="internal-tools-section" key={section.title}>
          <div className="internal-tools-section-label">{section.title}</div>
          <CRow className="g-4">
            {section.groups.map((group) => (
              <CCol {...getSectionColumnProps(section, group)} key={group.title}>
                <CCard
                  className={`internal-tools-card h-100${
                    group.variant === 'primary' ? ' internal-tools-card--primary' : ''
                  }`}
                >
                  <CCardHeader>
                    <strong>{group.title}</strong>
                  </CCardHeader>
                  <CCardBody className="d-flex flex-column">
                    <p className="text-body-secondary mb-3">{group.description}</p>
                    <div className="internal-tools-card-actions d-flex align-items-center gap-2 flex-wrap">
                      {group.tools.map(renderToolAction)}
                    </div>
                  </CCardBody>
                </CCard>
              </CCol>
            ))}
          </CRow>
        </section>
      ))}
    </div>
  )
}

export default InternalTools
