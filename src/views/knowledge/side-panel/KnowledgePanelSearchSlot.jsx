import React from 'react'
import { CFormInput } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch } from '@coreui/icons'

const KnowledgePanelSearchSlot = ({ search, onSearchChange }) => (
  <div className="knowledge-side-panel-search">
    <div className="knowledge-side-panel-search-form">
      <div className="knowledge-side-panel-search-field">
        <CIcon icon={cilSearch} className="knowledge-side-panel-search-icon" />
        <CFormInput
          size="sm"
          value={search}
          placeholder="Search Knowledge"
          className="knowledge-side-panel-search-input"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
    </div>
  </div>
)

export default KnowledgePanelSearchSlot
