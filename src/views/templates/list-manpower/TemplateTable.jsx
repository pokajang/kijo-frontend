import React from 'react'
import TemplateProposalTable from '../shared/TemplateProposalTable'

const TemplateTable = ({ data = [], onDelete, onCreateBmCopy, loading = false }) => (
  <TemplateProposalTable
    type="manpower"
    data={data}
    onDelete={onDelete}
    onCreateBmCopy={onCreateBmCopy}
    loading={loading}
  />
)

export default TemplateTable
