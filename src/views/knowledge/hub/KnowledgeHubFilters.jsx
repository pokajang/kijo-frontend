import React from 'react'
import { CCol, CFormInput, CFormSelect, CRow } from '@coreui/react'

const KnowledgeHubFilters = ({
  category,
  categories = [],
  search,
  setCategory,
  setSearch,
  setStatus,
  setTag,
  status,
  tag,
  tags = [],
}) => (
  <CRow className="g-2 mb-4">
    <CCol md={4}>
      <CFormInput
        value={search}
        placeholder="Search guides, tags, modules..."
        onChange={(event) => setSearch(event.target.value)}
      />
    </CCol>
    <CCol md={3}>
      <CFormSelect value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="">All Categories</option>
        {categories.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </CFormSelect>
    </CCol>
    <CCol md={3}>
      <CFormSelect value={tag} onChange={(event) => setTag(event.target.value)}>
        <option value="">All Tags</option>
        {tags.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </CFormSelect>
    </CCol>
    <CCol md={2}>
      <CFormSelect value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
        <option value="archived">Archived</option>
        <option value="">All Statuses</option>
      </CFormSelect>
    </CCol>
  </CRow>
)

export default KnowledgeHubFilters
