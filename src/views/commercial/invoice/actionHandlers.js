import dialog from '../../../components/dialog/dialogService'
import { showToast } from '../../../components/toast/toastService'

/**
 * Centralized endpoints for each invoice action
 */
const endpoints = {
  generate: (id) => `${import.meta.env.VITE_API_BASE}invoices/${encodeURIComponent(id)}/pdf`,
  receipt: (id) => `${import.meta.env.VITE_API_BASE}invoices/${encodeURIComponent(id)}/receipt-pdf`,
  updateStatus: (id) =>
    `${import.meta.env.VITE_API_BASE}invoices/${encodeURIComponent(id)}/mark-paid`,
  markUnpaid: (id) =>
    `${import.meta.env.VITE_API_BASE}invoices/${encodeURIComponent(id)}/mark-unpaid`,
  updateHrdClaimRef: (id) =>
    `${import.meta.env.VITE_API_BASE}invoices/${encodeURIComponent(id)}/hrd-claim-ref`,
  delete: `${import.meta.env.VITE_API_BASE}invoices`,
}

const buildServicePeriod = (startDate, endDate) => {
  if (startDate && endDate) return `${startDate} to ${endDate}`
  return startDate || endDate || ''
}

const addDaysToDate = (dateValue, days) => {
  if (!dateValue) return ''
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''
  date.setDate(date.getDate() + Number(days || 0))
  return date.toISOString().slice(0, 10)
}

/**
 * Lookup endpoint by action
 */
const getEndpoint = (action) => endpoints[action]

/**
 * 1) Fetch all invoices and map to UI model
 */
export const fetchAllInvoices = async (setInvoices, setLoading, { showLoader = true } = {}) => {
  if (showLoader) setLoading(true)
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}invoices`, {
      method: 'GET',
      credentials: 'include',
    })
    const result = await res.json()
    if (result.status === 'success') {
      const mapped = result.invoices.map((row) => {
        const {
          id: rawId,
          invoice_ref_no,
          service_type,
          invoice_purpose,
          invoice_date,
          amount,
          grand_total,
          status,
          payment_method,
          payment_terms_days,
          payment_terms_source,
          due_date,
          hrd_claim_ref,
          client_name,
          client_ssm,
          client_tin,
          client_address,
          client_city,
          client_state,
          client_zip,
          pic_name,
          pic_email,
          pic_phone,
          loa_number, // aliased LOA/PO number
          grant_approval_no,
          remarks,
          created_by_name,
          created_by_code,
          created_by_email,
          service_start_date,
          service_end_date,
        } = row

        const diffDays = Math.floor((Date.now() - new Date(invoice_date)) / (1000 * 3600 * 24))
        const termsDays = Number(payment_terms_days ?? 30)
        const resolvedDueDate = due_date || addDaysToDate(invoice_date, termsDays)
        const isHrdTraining =
          String(service_type || '').toLowerCase() === 'training' &&
          String(payment_method || '')
            .toLowerCase()
            .includes('hrd')

        const billedAddress = [
          row.invoice_client_address,
          row.invoice_client_city,
          row.invoice_client_state,
          row.invoice_client_zip,
        ]
          .filter(Boolean)
          .join(', ')

        return {
          id: invoice_ref_no,
          rawId,
          projectId: row.project_id,
          serviceType: service_type,
          purpose: invoice_purpose,
          serviceStartDate: service_start_date || '',
          serviceEndDate: service_end_date || '',
          servicePeriod: buildServicePeriod(service_start_date, service_end_date),

          billedTo: {
            company: {
              name: row.invoice_client_name,
              ssm: row.invoice_client_ssm,
              tin: row.invoice_client_tin,
              address: billedAddress,
              city: row.invoice_client_city,
              state: row.invoice_client_state,
              zip: row.invoice_client_zip,
            },
            pic: {
              name: row.invoice_pic_name,
              email: row.invoice_pic_email,
              phone: row.invoice_pic_phone,
              position: row.invoice_pic_position,
            },
          },

          requestor: {
            company: {
              name: client_name,
              ssm: client_ssm,
              tin: client_tin,
              address: client_address,
              city: client_city,
              state: client_state,
              zip: client_zip,
            },
            pic: { name: pic_name, email: pic_email, phone: pic_phone, position: row.pic_position },
          },

          internalPic: {
            id: row.created_by || null,
            name: created_by_name || '',
            code: created_by_code || '',
            email: created_by_email || '',
          },

          dateIssued: invoice_date,
          paymentTermsDays: termsDays,
          paymentTermsSource: payment_terms_source || 'legacy',
          dueDate: resolvedDueDate,
          dueInDays: `${diffDays} day${diffDays !== 1 ? 's' : ''}`,
          amount: parseFloat(amount).toFixed(2),
          grandTotal: parseFloat(grand_total).toFixed(2),
          status,
          paymentMethod: payment_method,
          hrdClaimRef: hrd_claim_ref || '',
          isHrdTraining,

          // Use the aliased field here
          loaNo: loa_number || '',

          hrdGrantNo: grant_approval_no,
          remarks,
          raw: row,
        }
      })
      setInvoices(mapped)
    } else {
      console.error('Fetch invoices failed:', result.message)
    }
  } catch (err) {
    console.error('Error fetching invoices:', err)
  } finally {
    setLoading(false)
  }
}

/**
 * 2) Handle toolbar actions: generate, receipt, view, edit, markpaid
 */
export const handleAction = async (
  action,
  invoice,
  setCurrent,
  setSelected,
  setShowMarkPaid,
  setViewVisible,
  setEditVisible,
  setHrdClaimInvoice,
  setShowHrdClaimModal,
) => {
  setCurrent(invoice)
  setSelected(invoice)

  const { raw } = invoice
  const endpoint = getEndpoint(action)

  if (action === 'generate' || action === 'receipt') {
    if (!endpoint) {
      console.error(`No endpoint configured for action: ${action}`)
      return
    }
    const url = endpoint(raw.id)
    const popup = window.open('', '_blank')
    if (!popup) {
      dialog.alert('Popup blocked. Please allow popups to open the PDF.')
      return
    }
    try {
      const res = await fetch(url, { method: 'HEAD', credentials: 'include' })
      if (!res.ok && res.status !== 405 && res.status !== 501) {
        dialog.alert(`PDF generation may have failed (${res.status}). The PDF tab will still open.`)
      }
    } catch (err) {
      dialog.alert('PDF generation may have failed. The PDF tab will still open.')
    } finally {
      popup.location.href = url
    }
    return
  }
  if (action === 'markpaid') {
    setShowMarkPaid(true)
    return
  }
  if (action === 'view') {
    setViewVisible(true)
    return
  }
  if (action === 'edit') {
    setEditVisible(true)
    return
  }
  if (action === 'updatehrdclaim') {
    setHrdClaimInvoice(invoice)
    setShowHrdClaimModal(true)
    return
  }

  console.warn(`Unsupported invoice action: ${action}`)
}

/**
 * 3) Confirm Mark Paid -> update status & refresh
 */
export const handleMarkPaidConfirmed = async (invoice, paidData, refreshList, setShowMarkPaid) => {
  try {
    const endpoint = getEndpoint('updateStatus')(invoice.rawId)
    await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: invoice.rawId, ...paidData }),
    })
    showToast('Invoice marked as paid.')
    await refreshList()
  } catch (err) {
    console.error('Update status failed:', err)
  } finally {
    setShowMarkPaid(false)
  }
}

/**
 * 3b) Mark Pending -> clear paid fields & refresh
 */
export const handleMarkUnpaidConfirmed = async (invoice, refreshList) => {
  if (!(await dialog.confirm(`Mark invoice ${invoice.id} as Pending?`))) return
  try {
    const endpoint = getEndpoint('markUnpaid')(invoice.rawId)
    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: invoice.rawId }),
    })
    const result = await res.json()
    if (result.status === 'success') {
      showToast('Invoice marked as pending.')
      await refreshList()
    } else {
      dialog.alert(result.message || 'Failed to mark as Pending.')
    }
  } catch (err) {
    console.error('Mark unpaid failed:', err)
    dialog.alert('Server error while marking pending.')
  }
}

/**
 * 4) Delete invoice -> confirm & refresh
 */
export const handleDelete = async (invoice, refreshList) => {
  if (
    !(await dialog.confirm(`Delete invoice ${invoice.id}?`, {
      confirmText: 'Delete',
      confirmColor: 'danger',
    }))
  )
    return
  try {
    const endpoint = getEndpoint('delete')
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ invoice_ref_no: invoice.id }),
    })
    const result = await res.json()
    if (result.status === 'success') {
      showToast('Invoice deleted.')
      await refreshList()
    } else {
      dialog.alert('Delete failed: ' + result.message)
    }
  } catch (err) {
    console.error('Delete error:', err)
    dialog.alert('Server error on delete.')
  }
}

/**
 * 5) Update HRD claim reference for Training + HRD invoices
 */
export const handleUpdateHrdClaimRefConfirmed = async (
  invoice,
  hrdClaimRef,
  refreshList,
  setShowHrdClaimModal,
) => {
  try {
    const endpoint = getEndpoint('updateHrdClaimRef')(invoice.rawId)
    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: invoice.rawId,
        hrd_claim_ref: hrdClaimRef,
      }),
    })
    const result = await res.json()
    if (result.status === 'success') {
      showToast('HRD claim reference updated.')
      await refreshList()
    } else {
      dialog.alert(`Update failed: ${result.message || 'Unknown error'}`)
    }
  } catch (err) {
    console.error('Update HRD claim ref failed:', err)
    dialog.alert('Server error while updating HRD claim reference.')
  } finally {
    setShowHrdClaimModal(false)
  }
}
