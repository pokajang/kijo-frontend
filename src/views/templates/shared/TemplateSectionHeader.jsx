import React from 'react'

const TemplateSectionHeader = ({ title, description, className = '', id }) => (
  <div className={`border-bottom pb-2 mb-3 ${className}`.trim()}>
    <h2 id={id} className="h6 mb-1">
      {title}
    </h2>
    {description && <p className="small text-muted mb-0">{description}</p>}
  </div>
)

export default TemplateSectionHeader
