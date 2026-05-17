import React from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { getProposalDetailPath, getProposalListPath } from './proposalTabs'
import { normalizeTemplateLanguage } from '../shared/templateProposalUtils'

const getRedirectLanguage = (search) => {
  const params = new URLSearchParams(search)
  return normalizeTemplateLanguage(params.get('language'))
}

export const ProposalListRedirect = ({ type }) => {
  const location = useLocation()
  return <Navigate to={getProposalListPath(type, getRedirectLanguage(location.search))} replace />
}

export const ProposalDetailRedirect = ({ type }) => {
  const { id } = useParams()
  const location = useLocation()
  const language = getRedirectLanguage(location.search)
  return (
    <Navigate
      to={getProposalDetailPath(type, id)}
      state={{ returnTo: getProposalListPath(type, language) }}
      replace
    />
  )
}
