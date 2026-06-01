// src/hooks/usePaymentData.js

import { useEffect, useState, useCallback } from 'react'
import { fetchAllPagedRecords, fetchJson } from '../../../utils/detailPages'
import { getYearScopedParamSets, mergeUniqueRecordsById } from '../../../components/filters'

export const loadPaymentsForPeriod = async (apiBase, periodRange) => {
  const paramSets = getYearScopedParamSets(periodRange)
  const firstParams = paramSets[0] || {}
  const data = await fetchJson(
    `${apiBase}vendor-payments?${new URLSearchParams({
      ...firstParams,
      per_page: 1,
    }).toString()}`,
  )
  const isSuccess =
    data?.status === 'success' ||
    data?.success === true ||
    Array.isArray(data?.history) ||
    Array.isArray(data?.data)

  if (!isSuccess) {
    return {
      payments: [],
      staffRoles: [],
    }
  }

  const paymentLists = await Promise.all(
    paramSets.map((params) =>
      fetchAllPagedRecords({
        url: `${apiBase}vendor-payments`,
        params,
        dataKeys: ['history', 'data'],
        perPage: 100,
      }),
    ),
  )
  const roles = Array.isArray(data?.staff?.roles)
    ? data.staff.roles
    : Array.isArray(data?.roles)
      ? data.roles
      : []

  return {
    payments: mergeUniqueRecordsById(paymentLists.flat(), ['id', 'payment_id']),
    staffRoles: roles,
  }
}

const usePaymentData = (periodRange) => {
  const API_BASE = import.meta.env.VITE_API_BASE
  const [staffRoles, setStaffRoles] = useState([])
  const [allPayments, setAllPayments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const { payments, staffRoles: roles } = await loadPaymentsForPeriod(API_BASE, periodRange)
      setAllPayments(payments)
      setStaffRoles(roles)
    } catch (err) {
      console.error('Failed to fetch payments', err)
      setAllPayments([])
      setStaffRoles([])
    } finally {
      setLoading(false)
    }
  }, [API_BASE, periodRange])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  return {
    staffRoles,
    allPayments,
    loading,
    reloadPayments: fetchPayments,
  }
}

export default usePaymentData
