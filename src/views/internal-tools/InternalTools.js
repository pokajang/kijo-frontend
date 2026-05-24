import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilOptions } from '@coreui/icons'

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
            overflow: true,
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

const getSectionColumnProps = (groupCount) => {
  if (groupCount === 1) return { lg: 4, md: 6 }
  if (groupCount === 3) return { lg: 4, md: 6 }
  if (groupCount === 2) return { lg: 6, md: 6 }
  return { lg: 3, md: 6 }
}

const InternalTools = () => {
  const renderToolAction = (tool) => (
    <CButton
      key={tool.href || tool.to || tool.label}
      size="sm"
      color={tool.color}
      variant={tool.variant}
      {...(tool.to
        ? { as: NavLink, to: tool.to }
        : {
            href: tool.href,
            target: '_blank',
            rel: 'noopener noreferrer',
          })}
    >
      {tool.label}
    </CButton>
  )

  const renderOverflowAction = (tool) => (
    <CDropdownItem
      key={tool.href || tool.to}
      {...(tool.to
        ? { as: NavLink, to: tool.to }
        : {
            href: tool.href,
            target: '_blank',
            rel: 'noopener noreferrer',
          })}
    >
      {tool.label}
    </CDropdownItem>
  )

  return (
    <>
      {toolSections.map((section) => (
        <div className="mb-4" key={section.title}>
          <div className="small text-body-secondary mb-2">{section.title}</div>
          <CRow className="g-4">
            {section.groups.map((group) => (
              <CCol {...getSectionColumnProps(section.groups.length)} key={group.title}>
                <CCard className="h-100">
                  <CCardHeader>
                    <strong>{group.title}</strong>
                  </CCardHeader>
                  <CCardBody>
                    <p>{group.description}</p>
                    <div className="internal-tools-card-actions d-flex align-items-center gap-2 flex-wrap">
                      {(() => {
                        const visibleTools = group.tools
                        const primaryTools = visibleTools.filter((tool) => !tool.overflow)
                        const overflowTools = visibleTools.filter((tool) => tool.overflow)

                        return (
                          <>
                            {primaryTools.map(renderToolAction)}
                            {overflowTools.length > 0 && (
                              <CDropdown className="ms-auto">
                                <CDropdownToggle
                                  color="transparent"
                                  size="sm"
                                  caret={false}
                                  className="internal-tools-card-kebab"
                                  aria-label={`${group.title} actions`}
                                >
                                  <CIcon icon={cilOptions} />
                                </CDropdownToggle>
                                <CDropdownMenu alignment="end">
                                  {overflowTools.map(renderOverflowAction)}
                                </CDropdownMenu>
                              </CDropdown>
                            )}
                          </>
                        )
                      })()}
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
}

export default InternalTools
