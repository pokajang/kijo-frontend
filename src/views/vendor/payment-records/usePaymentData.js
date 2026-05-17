// src/hooks/usePaymentData.js

import { useEffect, useState, useCallback } from 'react'
import { fetchAllPagedRecords, fetchJson } from '../../../utils/detailPages'

const usePaymentData = () => {
  const API_BASE = import.meta.env.VITE_API_BASE
  const currentYear = new Date().getFullYear()
  const [staffRoles, setStaffRoles] = useState([])
  const [allPayments, setAllPayments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchJson(`${API_BASE}vendor-payments?year=${currentYear}&per_page=1`)
      const isSuccess =
        data?.status === 'success' ||
        data?.success === true ||
        Array.isArray(data?.history) ||
        Array.isArray(data?.data)

      if (isSuccess) {
        const payments = await fetchAllPagedRecords({
          url: `${API_BASE}vendor-payments`,
          params: { year: currentYear },
          dataKeys: ['history', 'data'],
          perPage: 100,
        })
        setAllPayments(payments)

        // grab the roles array (or empty array)
        const roles = Array.isArray(data?.staff?.roles)
          ? data.staff.roles
          : Array.isArray(data?.roles)
            ? data.roles
            : []
        setStaffRoles(roles)
      } else {
        setAllPayments([])
        setStaffRoles([])
      }
    } catch (err) {
      console.error('Failed to fetch payments', err)
      setAllPayments([])
      setStaffRoles([])
    } finally {
      setLoading(false)
    }
  }, [API_BASE, currentYear])

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
