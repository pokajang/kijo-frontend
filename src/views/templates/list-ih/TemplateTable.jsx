import React from 'react'
import TemplateProposalTable from '../shared/TemplateProposalTable'

const TemplateTable = ({ data = [], onDelete, onCreateBmCopy, loading = false }) => (
  <TemplateProposalTable
    type="ih"
    data={data}
    onDelete={onDelete}
    onCreateBmCopy={onCreateBmCopy}
    loading={loading}
  />
)

export default TemplateTable
