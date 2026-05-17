import React from 'react'
import { Navigate, useParams } from 'react-router-dom'
import TrainingProposalDetailPage from '../list-training/TrainingProposalDetailPage'
import TemplateProposalDetailPage from '../shared/TemplateProposalDetailPage'
import { normalizeProposalType } from './proposalTabs'

const supportedTypes = new Set(['training', 'ih', 'manpower', 'special'])

const ProposalDetailRouter = () => {
  const { type: rawType } = useParams()
  const type = normalizeProposalType(rawType)

  if (!supportedTypes.has(type)) {
    return <Navigate to="/templates/proposals" replace />
  }

  if (type === 'training') return <TrainingProposalDetailPage />

  return <TemplateProposalDetailPage type={type} />
}

export default ProposalDetailRouter
