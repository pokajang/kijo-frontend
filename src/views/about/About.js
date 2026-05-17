import React from 'react'
import { CCard, CCardBody } from '@coreui/react'

import currentLogo from 'src/assets/brand/logo.svg'
import kijoV01Logo from 'src/assets/brand/versions/kijo-v01-logo.svg'

const version01Rows = [
  { label: 'Build', value: '13 March 2026' },
  { label: 'Development Started', value: '1 Feb 2025' },
  { label: 'Online Since', value: '1 July 2025' },
  { label: 'Developer', value: 'Azam Husain (HOD IT, Jan 2025 - current)' },
]

const version02Rows = [
  { label: 'Build', value: '18 May 2026' },
  { label: 'Development Started', value: '4 May 2026' },
  { label: 'Online Since', value: '18 May 2026' },
  { label: 'Developer', value: 'Azam Husain (HOD IT, Jan 2025 - current)' },
]

const version02Description =
  'Version 02 moves KIJO from a pure PHP backend toward Laravel, an industry-aligned backend framework. The goal is to improve maintainability, speed up future delivery, and make backend development more structured. UI/UX changes are included, but they remain limited compared with the backend rework.'

const version01Description =
  'A focused workspace for CRM, projects, commercial records, vendors, staff operations, and internal resources. Version 01 is the first internal release of KIJO, with ongoing improvements shaped by daily operational needs and user feedback.'

const historyParagraphs = [
  'The KIJO name was first coined in 2022, when it was used for a temporary placeholder website that centralized simple internal links, including Google links for leave applications and other day-to-day references.',
  'At the time, KIJO was only a quick fix. There were no dedicated development resources to turn it into a full internal system, so it remained a lightweight stopgap until a more complete platform could be planned and built.',
  'In 2025, after the IT department was formally established, development work began on the first proper version of KIJO. This version started as a proof of concept to show how much value a custom-built internal tool could bring to daily operations.',
  'KIJO Version 01 was built with a simple stack: React for the frontend and PHP for the backend. The early focus was to deliver practical core workflows quickly, including CRM records, project tracking, commercial records, vendor information, quotations, and staff operations.',
  'KIJO continues to evolve around real operational needs, with updates focused on reducing duplicate work, improving record visibility, and making internal processes easier to track.',
]

const LogoFrame = ({ src, alt }) => (
  <div className="border rounded-2 px-3 py-2 bg-body">
    <img src={src} alt={alt} height="36" />
  </div>
)

const MetadataList = ({ rows }) => (
  <div className="d-grid gap-2" style={{ maxWidth: '42rem' }}>
    {rows.map((item) => (
      <div
        className="d-flex flex-column flex-sm-row align-items-sm-baseline gap-1 gap-sm-3"
        key={item.label}
      >
        <span className="text-uppercase text-muted small">{item.label}</span>
        <span className="fw-semibold">{item.value}</span>
      </div>
    ))}
  </div>
)

const VersionHeader = ({ title, logo, logoAlt, heading: Heading = 'h2' }) => (
  <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center gap-3 mb-3">
    <LogoFrame src={logo} alt={logoAlt} />
    <Heading className="h3 mb-0">{title}</Heading>
  </div>
)

const VersionCard = ({
  title,
  logo,
  logoAlt,
  description,
  rows,
  heading = 'h2',
  notice = null,
  children,
  className = '',
}) => (
  <CCard className={`records-page-card border-0 shadow-sm${className ? ` ${className}` : ''}`}>
    <CCardBody className="records-page-card-body p-4 p-lg-5">
      <div className="mb-4">
        <VersionHeader title={title} logo={logo} logoAlt={logoAlt} heading={heading} />
        <p className="text-muted mb-0">{description}</p>
      </div>

      {notice}

      <MetadataList rows={rows} />

      {children}
    </CCardBody>
  </CCard>
)

const HistorySection = () => (
  <div className="mt-5" style={{ maxWidth: '56rem' }}>
    <h2 className="h5 mb-2">History</h2>
    <div className="d-grid gap-3 text-muted">
      {historyParagraphs.map((paragraph) => (
        <p className="mb-0" key={paragraph}>
          {paragraph}
        </p>
      ))}
    </div>
  </div>
)

const About = () => {
  return (
    <>
      <VersionCard
        title="KIJO Version 02"
        logo={currentLogo}
        logoAlt="KIJO Version 02 logo"
        description={version02Description}
        rows={version02Rows}
        heading="h1"
      />

      <VersionCard
        title="KIJO Version 01"
        logo={kijoV01Logo}
        logoAlt="KIJO Version 01 logo"
        description={version01Description}
        rows={version01Rows}
        className="mt-4"
      >
        <HistorySection />
      </VersionCard>
    </>
  )
}

export default About
