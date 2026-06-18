import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { getPeriodRangePreset, getPeriodRangeScopeLabel } from '../../../../components/filters'
import ClientModuleNavStrip from '../components/ClientModuleNavStrip'
import ClientRoiTableCard from './ClientRoiTableCard'
import { buildClientRoiDetailSearch, getPeriodRangeFromSearchParams } from './clientRoiRouteUtils'
import { getCurrentReturnTo } from '../../../../utils/navigation/returnTo'

const buildRoiUrl = (periodRange) => {
  const params = new URLSearchParams()
  if (periodRange?.startDate) params.set('start', periodRange.startDate)
  if (periodRange?.endDate) params.set('end', periodRange.endDate)
  const query = params.toString()
  return `${import.meta.env.VITE_API_BASE}client-companies/roi${query ? `?${query}` : ''}`
}

const ClientRoiPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [profitabilityFilter, setProfitabilityFilter] = useState('all')
  const periodRange = useMemo(
    () => getPeriodRangeFromSearchParams(searchParams, 'ytd'),
    [searchParams],
  )

  useEffect(() => {
    const controller = new AbortController()

    const fetchRows = async () => {
      setLoading(true)
      try {
        const res = await fetch(buildRoiUrl(periodRange), {
          credentials: 'include',
          signal: controller.signal,
        })
        const result = await res.json()
        if (result.status === 'success') {
          setRows(Array.isArray(result.data?.rows) ? result.data.rows : [])
        } else {
          console.error('Failed to fetch client ROI report:', result.message)
          setRows([])
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch client ROI report:', err)
          setRows([])
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    fetchRows()

    return () => controller.abort()
  }, [periodRange])

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return rows.filter((row) => {
      if (
        term &&
        !String(row.company_name || '')
          .toLowerCase()
          .includes(term)
      ) {
        return false
      }

      const totalCost = Number(row.total_cost || 0)
      const actualProfit = Number(row.actual_profit || 0)

      if (profitabilityFilter === 'profitable') return totalCost > 0 && actualProfit > 0
      if (profitabilityFilter === 'loss') return totalCost > 0 && actualProfit < 0
      if (profitabilityFilter === 'no_cost') return totalCost <= 0

      return true
    })
  }, [profitabilityFilter, rows, searchTerm])

  const resetFilters = () => {
    setSearchTerm('')
    setProfitabilityFilter('all')
    setSearchParams(buildClientRoiDetailSearch(getPeriodRangePreset('ytd')).replace(/^\?/, ''), {
      replace: true,
    })
  }

  const updatePeriodRange = (nextRange) => {
    setSearchParams(buildClientRoiDetailSearch(nextRange).replace(/^\?/, ''), { replace: true })
  }

  return (
    <>
      <ClientModuleNavStrip />
      <ClientRoiTableCard
        rows={filteredRows}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        profitabilityFilter={profitabilityFilter}
        onProfitabilityFilterChange={setProfitabilityFilter}
        periodRange={periodRange}
        onPeriodRangeChange={updatePeriodRange}
        scopeLabel={getPeriodRangeScopeLabel(periodRange)}
        onResetFilters={resetFilters}
        onOpenCommercialHistory={(row) =>
          navigate(`/client/roi/${row.company_id}${buildClientRoiDetailSearch(periodRange)}`, {
            state: { record: row, returnTo: getCurrentReturnTo(location) },
          })
        }
        onViewClient={(row) =>
          navigate(`/client/manage/${row.company_id}`, {
            state: { company: row, returnTo: getCurrentReturnTo(location) },
          })
        }
      />
    </>
  )
}

export default ClientRoiPage
