import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CAlert, CSpinner } from '@coreui/react'

import dialog from '../../../components/dialog/dialogService'
import { getProjectCommercialDocs } from './projectApi'

const emptyDocs = {
  invoices: [],
  delivery_orders: [],
  jd14: [],
  vendor_loas: [],
  vendor_payments: [],
  supplier_pos: [],
}

const safeArray = (value) => (Array.isArray(value) ? value : [])
const normalizeGroupKeys = (groupKeys) => {
  if (!groupKeys) return null
  return Array.isArray(groupKeys) ? groupKeys.filter(Boolean) : [groupKeys]
}

const money = (value) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? `RM ${parsed.toFixed(2)}` : ''
}

export const buildProjectCommercialDocGroups = (docs = emptyDocs) => {
  const groups = []

  const push = (key, label, items) => {
    const normalized = safeArray(items).filter(Boolean)
    if (normalized.length) groups.push({ key, label, items: normalized })
  }

  push(
    'invoices',
    'Invoices',
    safeArray(docs.invoices).map((invoice) => ({
      key: `invoice-${invoice.id}`,
      label: invoice.invoice_ref_no || `Invoice #${invoice.id}`,
      secondary: [invoice.status, money(invoice.grand_total)].filter(Boolean).join(' | '),
      href: `/commercial/invoice/${encodeURIComponent(invoice.id)}`,
    })),
  )

  push(
    'delivery-orders',
    'Delivery Orders',
    safeArray(docs.delivery_orders).map((deliveryOrder) => ({
      key: `do-${deliveryOrder.id}`,
      label: deliveryOrder.do_number || `DO #${deliveryOrder.id}`,
      href: `/commercial/delivery-order/${encodeURIComponent(deliveryOrder.id)}`,
    })),
  )

  push(
    'jd14',
    'JD14 Forms',
    safeArray(docs.jd14).map((form) => ({
      key: `jd14-${form.id}`,
      label: form.approval_no || `JD14 #${form.id}`,
      href: `/commercial/jd14/${encodeURIComponent(form.id)}`,
    })),
  )

  push(
    'vendor-loas',
    'Vendor LOAs',
    safeArray(docs.vendor_loas).map((loa) => ({
      key: `vendor-loa-${loa.id}`,
      label: loa.loa_ref_no || `Vendor LOA #${loa.id}`,
      secondary: loa.vendor_name || '',
      href: `/commercial/vendor-loa/${encodeURIComponent(loa.id)}`,
    })),
  )

  push(
    'vendor-payments',
    'Vendor Payments',
    safeArray(docs.vendor_payments).map((payment) => ({
      key: `vendor-payment-${payment.id}`,
      label: `Vendor payment #${payment.id}`,
      secondary: [payment.vendor_name, payment.status, money(payment.amount)]
        .filter(Boolean)
        .join(' | '),
      href: payment.vendor_loa_id
        ? `/commercial/vendor-loa/${encodeURIComponent(payment.vendor_loa_id)}`
        : undefined,
    })),
  )

  push(
    'supplier-pos',
    'Supplier POs',
    safeArray(docs.supplier_pos).map((po) => ({
      key: `supplier-po-${po.po_id}`,
      label: po.po_ref_no || `Supplier PO #${po.po_id}`,
      secondary: [po.supplier_name, po.status].filter(Boolean).join(' | '),
      href: `/commercial/supplier-po/${encodeURIComponent(po.po_id)}`,
    })),
  )

  return groups
}

export const hasProjectCommercialDocGroups = (groups = []) =>
  groups.some((group) => safeArray(group.items).length > 0)

export const filterProjectCommercialDocGroups = (groups = [], groupKeys = null) => {
  const allowedKeys = normalizeGroupKeys(groupKeys)
  if (!allowedKeys) return safeArray(groups)
  return safeArray(groups).filter((group) => allowedKeys.includes(group.key))
}

export const useProjectCommercialDocs = (projectId, visible, groupKeys = null) => {
  const [docs, setDocs] = useState(emptyDocs)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible || !projectId) {
      setDocs(emptyDocs)
      setLoading(false)
      setError('')
      return undefined
    }

    const controller = new AbortController()
    setLoading(true)
    setError('')

    getProjectCommercialDocs(projectId, { signal: controller.signal })
      .then((payload) => {
        setDocs(payload?.data || emptyDocs)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        console.error('Project commercial docs fetch error:', err)
        setDocs(emptyDocs)
        setError(err.message || 'Unable to load existing commercial records.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [projectId, visible])

  const groups = useMemo(() => {
    const nextGroups = buildProjectCommercialDocGroups(docs)
    return filterProjectCommercialDocGroups(nextGroups, groupKeys)
  }, [docs, groupKeys])
  const hasExistingDocs = hasProjectCommercialDocGroups(groups)

  return { docs, groups, hasExistingDocs, loading, error }
}

const RelatedRows = ({ groups, onOpen }) => (
  <div className="mt-2 d-flex flex-column gap-1">
    {groups.map((group) => {
      const items = safeArray(group.items)
      if (!items.length) return null
      return (
        <div key={group.key || group.label} className="small text-break">
          <span className="fw-semibold">{group.label}: </span>
          {items.map((item, index) => (
            <React.Fragment
              key={`${group.key || group.label}-${item.key || item.href || item.label}`}
            >
              {index > 0 ? <span>, </span> : null}
              {item.href ? (
                <a href={item.href} onClick={(event) => onOpen(event, item.href)}>
                  {item.label || item.href}
                </a>
              ) : (
                <span>{item.label || '-'}</span>
              )}
              {item.secondary ? <span className="text-muted"> - {item.secondary}</span> : null}
            </React.Fragment>
          ))}
        </div>
      )
    })}
  </div>
)

export const ProjectCommercialDocsNotice = ({
  groups,
  loading,
  error,
  recordLabel = 'commercial records',
  createLabel = 'another document',
}) => {
  const navigate = useNavigate()
  const hasDocs = hasProjectCommercialDocGroups(groups)

  const openRecord = useCallback(
    (event, href) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }
      event.preventDefault()
      navigate(href)
    },
    [navigate],
  )

  if (loading) {
    return (
      <CAlert color="info" className="mb-3 d-flex align-items-center gap-2">
        <CSpinner size="sm" />
        <span>Checking existing {recordLabel}...</span>
      </CAlert>
    )
  }

  if (error) {
    return (
      <CAlert color="warning" className="mb-3">
        Unable to check existing {recordLabel}. You can continue, but review the relevant commercial
        list if this project may already have records.
      </CAlert>
    )
  }

  if (!hasDocs) return null

  return (
    <CAlert color="warning" className="mb-3">
      <div>
        Existing {recordLabel} found for this project. Review before creating {createLabel}.
      </div>
      <RelatedRows groups={groups} onOpen={openRecord} />
    </CAlert>
  )
}

export const confirmExistingCommercialDocs = async ({
  groups,
  loading,
  recordLabel = 'commercial records',
  createLabel = 'this document',
  title = 'Existing Commercial Records',
}) => {
  if (loading) {
    await dialog.alert(`Still checking existing ${recordLabel}. Please try again in a moment.`)
    return false
  }

  if (!hasProjectCommercialDocGroups(groups)) return true

  return dialog.confirm(
    `This project already has ${recordLabel}. Continue creating ${createLabel}?`,
    {
      title,
      confirmText: 'Continue',
      cancelText: 'Cancel',
      alert: {
        color: 'warning',
        message: `Review the linked ${recordLabel} before creating ${createLabel}.`,
      },
      relatedRecords: { groups },
    },
  )
}
