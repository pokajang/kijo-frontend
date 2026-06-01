import dialog from '../../../../components/dialog/dialogService'
import { getRecordListPath } from '../config/recordTabs'
import { fetchJsonCompat, getMessage, isSuccess } from './compatApi'
// crm/records/services/recordsActions.js

const quoteRecordRoutes = (service) => {
  const base = `${import.meta.env.VITE_API_BASE}quote-records/${service}`
  const withId = (id, suffix = '') => `${base}/${encodeURIComponent(id)}${suffix}`
  return {
    delete: (id) => withId(id),
    fail: (id) => withId(id, '/fail'),
    success: (id) => withId(id, '/award'),
    reAward: (id) => withId(id, '/re-award'),
    unAward: (id) => withId(id, '/un-award'),
    generate: (id) => withId(id, '/pdf'),
    followUp: (id) => withId(id, '/follow-up'),
    syncClient: (id) => withId(id, '/sync-client'),
    syncClientDiscover: (id) => withId(id, '/related-docs'),
  }
}

// Centralized endpoints for all service types
export const endpointsByService = {
  'training-tab': quoteRecordRoutes('training'),
  'ih-tab': quoteRecordRoutes('ih'),
  'manpower-tab': quoteRecordRoutes('manpower'),
  'special-tab': quoteRecordRoutes('special'),
  'equipment-tab': quoteRecordRoutes('equipment'),
}

const safeArray = (value) => (Array.isArray(value) ? value : [])

const buildRelatedRecordGroups = (related = {}) => {
  const groups = []
  const projects = safeArray(related.projects)
  const invoices = safeArray(related.invoices)
  const deliveryOrders = safeArray(related.delivery_orders)
  const jd14 = safeArray(related.jd14)
  const vendorLoas = safeArray(related.vendor_loas)
  const vendorPayments = safeArray(related.vendor_payments)

  if (projects.length) {
    groups.push({
      key: 'projects',
      label: 'Linked Projects',
      items: projects.map((project) => ({
        key: `project-${project.id}`,
        label: `Project #${project.id}: ${project.project_name || project.project_type || '-'}`,
        secondary: project.project_type || undefined,
        href: `/project/manage/${encodeURIComponent(project.id)}`,
      })),
    })
  }

  if (invoices.length) {
    groups.push({
      key: 'invoices',
      label: 'Invoices',
      items: invoices.map((invoice) => ({
        key: `invoice-${invoice.id}`,
        label: invoice.invoice_ref_no || `Invoice #${invoice.id}`,
        secondary: invoice.receipt_no ? `Receipt: ${invoice.receipt_no}` : undefined,
        href: `/commercial/invoice/${encodeURIComponent(invoice.id)}`,
      })),
    })
  }

  if (deliveryOrders.length) {
    groups.push({
      key: 'delivery-orders',
      label: 'Delivery Orders',
      items: deliveryOrders.map((deliveryOrder) => ({
        key: `do-${deliveryOrder.id}`,
        label: deliveryOrder.do_number || `DO #${deliveryOrder.id}`,
        href: `/commercial/delivery-order/${encodeURIComponent(deliveryOrder.id)}`,
      })),
    })
  }

  if (jd14.length) {
    groups.push({
      key: 'jd14',
      label: 'JD14 Forms',
      items: jd14.map((form) => ({
        key: `jd14-${form.id}`,
        label: form.approval_no || `JD14 #${form.id}`,
        href: `/commercial/jd14/${encodeURIComponent(form.id)}`,
      })),
    })
  }

  if (vendorLoas.length) {
    groups.push({
      key: 'vendor-loas',
      label: 'Vendor LOAs',
      items: vendorLoas.map((loa) => ({
        key: `loa-${loa.id}`,
        label: loa.loa_ref_no || `Vendor LOA #${loa.id}`,
        secondary: loa.vendor_name || undefined,
        href: `/commercial/vendor-loa/${encodeURIComponent(loa.id)}`,
      })),
    })
  }

  if (vendorPayments.length) {
    groups.push({
      key: 'vendor-payments',
      label: 'Vendor Payments',
      items: vendorPayments.map((payment) => ({
        key: `vendor-payment-${payment.id}`,
        label: `Vendor payment #${payment.id}${payment.status ? ` (${payment.status})` : ''}`,
        secondary: payment.loa_ref_no
          ? `LOA: ${payment.loa_ref_no}`
          : payment.payment_type || payment.payment_context || undefined,
        href: payment.vendor_loa_id
          ? `/commercial/vendor-loa/${encodeURIComponent(payment.vendor_loa_id)}`
          : undefined,
      })),
    })
  }

  return groups
}

const hasUnAwardBlockers = (related = {}) =>
  safeArray(related.invoices).length > 0 ||
  safeArray(related.delivery_orders).length > 0 ||
  safeArray(related.jd14).length > 0 ||
  safeArray(related.vendor_loas).length > 0 ||
  safeArray(related.vendor_payments).length > 0

export const createHandlers = ({
  serviceKey,
  fetchQuotes,
  setQuotes,
  setShowFailModal,
  setShowSuccessModal,
  setSelectedRecordIdForFail,
  setSelectedRecordIdForSuccess,
  setFailureReason,
  setSuccessReason,
  setAwardDate,
  setDescription,
  setClientLoaRefNo,
  navigate,
  onRowMoved,
}) => {
  const urls = endpointsByService[serviceKey] || {}
  const toApiDate = async (dateValue) => {
    if (!dateValue) return null
    if (dateValue instanceof Date) {
      return Number.isNaN(dateValue.getTime()) ? null : dateValue.toISOString().split('T')[0]
    }
    const parsed = new Date(dateValue)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0]
  }

  const showUnAwardBlockedNotice = async (id, message) => {
    let groups = []
    if (urls.syncClientDiscover) {
      try {
        const relatedPayload = await fetchJsonCompat(urls.syncClientDiscover(id), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        if (isSuccess(relatedPayload)) {
          groups = buildRelatedRecordGroups(relatedPayload.data || {})
        }
      } catch (relatedErr) {
        console.error('Failed to discover un-award blockers:', relatedErr)
      }
    }

    if (!groups.length) {
      return dialog.alert(message || 'Unable to un-award this quotation.')
    }

    return dialog.alert(
      'This quote cannot be un-awarded because its linked project already has commercial records.\n\nIf this awarded job did not materialise, terminate the project instead of un-awarding the quote.',
      {
        title: 'Cannot Un-Award Quote',
        alert: {
          color: 'warning',
          message: message || 'Linked commercial records must be reviewed first.',
        },
        relatedRecords: { groups },
      },
    )
  }

  const fetchRelatedDocsForQuote = async (id) => {
    if (!urls.syncClientDiscover) return null
    const relatedPayload = await fetchJsonCompat(urls.syncClientDiscover(id), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    return isSuccess(relatedPayload) ? relatedPayload.data || {} : null
  }

  return {
    // Delete Action
    handleDelete: async (id) => {
      if (
        !(await dialog.confirm('Are you sure you want to delete this quotation record?', {
          confirmText: 'Delete',
          confirmColor: 'danger',
        }))
      )
        return
      try {
        const result = await fetchJsonCompat(urls.delete(id), {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        })
        if (isSuccess(result)) {
          setQuotes((prev) =>
            prev.filter((q) => {
              const sameId = q.id === id
              const sameService = !q.serviceTab || q.serviceTab === serviceKey
              return !(sameId && sameService)
            }),
          )
          dialog.alert('Record deleted successfully.')
        } else {
          dialog.alert(getMessage(result, 'Failed to delete.'))
        }
      } catch (err) {
        console.error('Delete error:', err)
        dialog.alert(err?.message || 'An error occurred while deleting.')
      }
    },

    // Change to Fail Action
    handleChangeToFail: (id) => {
      setSelectedRecordIdForFail(id)
      setFailureReason('')
      setShowFailModal(true)
    },

    // Change to Fail Submit
    handleSubmitFail: async (failureReason, id) => {
      if (!failureReason.trim()) {
        return dialog.alert('Please enter a failure reason.')
      }
      try {
        const result = await fetchJsonCompat(urls.fail(id), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quote_id: id, id, remarks: failureReason }),
        })
        if (isSuccess(result)) {
          await fetchQuotes()
          setShowFailModal(false)
          // dialog.alert('Marked as Failed successfully.');
          onRowMoved && onRowMoved('Failed') // ✅ toast cue
        } else {
          dialog.alert(getMessage(result, 'Failed to update status.'))
        }
      } catch (err) {
        console.error('Fail update error:', err)
        dialog.alert('An error occurred while updating.')
      }
    },

    // Change to Success action
    handleChangeToSuccess: (id) => {
      setSelectedRecordIdForSuccess(id)
      setSuccessReason('')
      setShowSuccessModal(true)
    },

    // Confirm change to success
    confirmSuccess: async ({
      successReason,
      description,
      awardDate,
      clientLoaRefNo,
      selectedRecordIdForSuccess,
      projectCollaborators,
    }) => {
      if (!successReason.trim()) {
        dialog.alert('Please enter a success reason.')
        return false
      }
      try {
        const awardDateStr = await toApiDate(awardDate)
        const result = await fetchJsonCompat(urls.success(selectedRecordIdForSuccess), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_id: selectedRecordIdForSuccess,
            id: selectedRecordIdForSuccess,
            remarks: successReason,
            description,
            award_date: awardDateStr,
            client_award_ref_no: clientLoaRefNo || null,
            project_collaborators: projectCollaborators,
          }),
        })
        if (isSuccess(result)) {
          await fetchQuotes()
          setShowSuccessModal(false)
          onRowMoved && onRowMoved('Awarded')
          // dialog.alert('Marked as Awarded successfully.');
          // navigate('/project/manage');
          return true
        } else {
          dialog.alert(getMessage(result, 'Failed to update status.'))
          return false
        }
      } catch (err) {
        console.error('Success update error:', err)
        dialog.alert('An error occurred while updating.')
        return false
      }
    },

    confirmReAward: async ({
      successReason,
      description,
      awardDate,
      clientLoaRefNo,
      selectedRecordIdForSuccess,
      projectCollaborators,
    }) => {
      if (!urls.reAward) {
        dialog.alert('Re-award is not available for this service yet.')
        return false
      }
      if (!successReason.trim()) {
        dialog.alert('Please enter a success reason.')
        return false
      }
      try {
        const awardDateStr = await toApiDate(awardDate)
        const result = await fetchJsonCompat(urls.reAward(selectedRecordIdForSuccess), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_id: selectedRecordIdForSuccess,
            id: selectedRecordIdForSuccess,
            remarks: successReason,
            description,
            award_date: awardDateStr,
            client_award_ref_no: clientLoaRefNo || null,
            project_collaborators: projectCollaborators,
          }),
        })
        if (isSuccess(result)) {
          await fetchQuotes()
          setShowSuccessModal(false)
          onRowMoved && onRowMoved('Awarded')
          return true
        } else {
          dialog.alert(getMessage(result, 'Failed to re-award.'))
          return false
        }
      } catch (err) {
        console.error('Re-award error:', err)
        dialog.alert(err?.message || 'An error occurred while re-awarding.')
        return false
      }
    },

    // Handle Un-Award
    handleUnAward: async (id) => {
      if (!urls.unAward) {
        dialog.alert('Un-Award is not available for this service yet.')
        return
      }

      let relatedDocs = null
      let relatedGroups = []
      let blockedByRelatedDocs = false
      try {
        relatedDocs = await fetchRelatedDocsForQuote(id)
        relatedGroups = buildRelatedRecordGroups(relatedDocs || {})
        blockedByRelatedDocs = hasUnAwardBlockers(relatedDocs || {})
      } catch (err) {
        console.error('Failed to discover un-award related docs:', err)
      }

      const confirmMessage = blockedByRelatedDocs
        ? 'This quote cannot be un-awarded because its linked project already has commercial records.\n\nIf this awarded job did not materialise, terminate the project instead of un-awarding the quote.'
        : 'Are you sure you want to Un-Award this quotation?\n\nImportant: If there are multiple awarded projects for this quotation, only the most recent one will be un-awarded.'

      const confirmed = await dialog.confirm(confirmMessage, {
        title: blockedByRelatedDocs ? 'Cannot Un-Award Quote' : 'Confirmation',
        confirmText: blockedByRelatedDocs ? 'Un-Award Blocked' : 'Confirm',
        cancelText: blockedByRelatedDocs ? 'Close' : 'Cancel',
        confirmDisabled: blockedByRelatedDocs,
        confirmDisabledReason: blockedByRelatedDocs
          ? 'Review or remove linked commercial records before un-awarding.'
          : undefined,
        confirmColor: blockedByRelatedDocs ? 'secondary' : 'primary',
        alert: blockedByRelatedDocs
          ? {
              color: 'warning',
              message: 'Review the linked records below before taking the next action.',
            }
          : undefined,
        relatedRecords: relatedGroups.length ? { groups: relatedGroups } : undefined,
      })

      if (!confirmed || blockedByRelatedDocs) {
        return
      }

      try {
        const result = await fetchJsonCompat(urls.unAward(id), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quote_id: id, id }),
        })

        if (isSuccess(result)) {
          await fetchQuotes()
          dialog.alert(getMessage(result, 'Quotation Un-Awarded successfully.'))
        } else {
          dialog.alert(getMessage(result, 'Failed to Un-Award.'))
        }
      } catch (err) {
        console.error('Un-Award error:', err)
        await showUnAwardBlockedNotice(id, err?.message || 'An error occurred while Un-Awarding.')
      }
    },

    // Handle Edit Action
    handleEdit: (record) => {
      const svc = serviceKey.replace('-tab', '')
      navigate(`/crm/quotes?service=${svc}&edit=true&quoteId=${record.id}`, {
        state: { returnTo: getRecordListPath(serviceKey) },
      })
    },

    // Handle Revise Action
    handleRevise: (record) => {
      const svc = serviceKey.replace('-tab', '')
      navigate(`/crm/quotes?service=${svc}&edit=true&quoteId=${record.id}&isRevision=true`, {
        state: { returnTo: getRecordListPath(serviceKey) },
      })
    },

    // Handle Generate PDF
    handleGeneratePdf: (record) => {
      try {
        window.open(urls.generate(record.id), '_blank')
      } catch (err) {
        console.error('PDF generation failed:', err)
        dialog.alert('Failed to generate PDF.')
      }
    },

    // Sync Client Details
    handleSyncClientDetails: async (record) => {
      if (!urls.syncClient) {
        dialog.alert('Sync client details is not available for this service yet.')
        return
      }
      if (!record?.id) {
        dialog.alert('Quotation record is missing.')
        return
      }
      const proceed = await dialog.confirm(
        'Only use this feature if you have recently updated the client information.',
        {
          title: 'Sync Client Details',
          confirmText: 'Proceed',
          cancelText: 'Cancel',
        },
      )
      if (!proceed) {
        return
      }
      let selectedPicId = null
      const clientId = record?.clientId ? Number(record.clientId) : null
      const isAwarded = record?.status === 'Awarded'
      let cascadeSelection = null
      let checklistOptions = null

      if (isAwarded && urls.syncClientDiscover) {
        try {
          const relatedPayload = await fetchJsonCompat(urls.syncClientDiscover(record.id), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })
          if (isSuccess(relatedPayload)) {
            const related = relatedPayload.data || {}
            const deliveryOrders = Array.isArray(related.delivery_orders)
              ? related.delivery_orders
              : []
            const invoices = Array.isArray(related.invoices) ? related.invoices : []
            const receipts = Array.isArray(related.receipts) ? related.receipts : []
            const jd14 = Array.isArray(related.jd14) ? related.jd14 : []

            const groups = []
            const defaultSelected = {}

            if (deliveryOrders.length > 0) {
              groups.push({
                key: 'delivery_orders',
                label: 'Delivery Orders',
                items: deliveryOrders.map((item) => ({
                  value: String(item.id),
                  label: item.do_number || `DO #${item.id}`,
                })),
              })
              defaultSelected.delivery_orders = deliveryOrders.map((item) => String(item.id))
            }

            if (jd14.length > 0) {
              groups.push({
                key: 'jd14',
                label: 'JD14 Forms',
                items: jd14.map((item) => ({
                  value: String(item.id),
                  label: item.approval_no || `JD14 #${item.id}`,
                })),
              })
              defaultSelected.jd14 = jd14.map((item) => String(item.id))
            }

            if (invoices.length > 0) {
              groups.push({
                key: 'invoices',
                label: 'Invoices',
                items: invoices.map((item) => ({
                  value: String(item.id),
                  label: item.invoice_ref_no || `Invoice #${item.id}`,
                  secondary: item.receipt_no ? `Receipt: ${item.receipt_no}` : undefined,
                })),
              })
              defaultSelected.invoices = []
            }

            if (receipts.length > 0) {
              groups.push({
                key: 'receipts',
                label: 'Receipts',
                items: receipts.map((item) => ({
                  value: String(item.id),
                  label: item.receipt_no || `Receipt #${item.id}`,
                })),
              })
              defaultSelected.receipts = []
            }

            if (groups.length > 0) {
              checklistOptions = {
                label: 'Also sync related documents',
                groups,
                defaultSelected,
              }
            }
          }
        } catch (err) {
          console.error('Failed to discover related docs:', err)
        }
      }
      if (clientId) {
        try {
          const picRes = await fetch(
            `${import.meta.env.VITE_API_BASE}client-companies/${clientId}/pics`,
            {
              credentials: 'include',
            },
          )
          const picPayload = await picRes.json()
          const pics = Array.isArray(picPayload?.data) ? picPayload.data : []

          if (pics.length >= 2) {
            const options = pics.map((pic) => ({
              value: String(pic.pic_id),
              name: pic.full_name || '-',
              position: pic.position || '',
              email: pic.email || '',
              phone: pic.mobile_number || '',
              isCurrent:
                (record?.clientDetails?.email && pic.email === record.clientDetails.email) ||
                (record?.clientDetails?.fullName &&
                  pic.full_name === record.clientDetails.fullName) ||
                (record?.personInCharge && pic.full_name === record.personInCharge),
            }))
            const currentEmail = record?.clientDetails?.email || ''
            const currentName = record?.clientDetails?.fullName || record?.personInCharge || ''
            const defaultMatch =
              pics.find((pic) => currentEmail && pic.email === currentEmail) ||
              pics.find((pic) => currentName && pic.full_name === currentName) ||
              pics[0]
            const confirmResult = await dialog.confirm(
              'This will only update this document and will not affect past copies.',
              {
                title: 'Sync Client Details',
                confirmText: 'Sync',
                cancelText: 'Cancel',
                select: {
                  label: 'Contact Information',
                  mode: 'card',
                  helperText: 'This client has multiple contacts. Choose one to sync.',
                  options,
                  defaultValue: defaultMatch ? String(defaultMatch.pic_id) : options[0]?.value,
                },
                ...(checklistOptions
                  ? {
                      checklist: checklistOptions,
                      acknowledge: {
                        label: 'I understand this will update the selected documents.',
                        required: true,
                      },
                    }
                  : {}),
              },
            )
            const confirmed =
              typeof confirmResult === 'object'
                ? confirmResult.confirmed === true
                : confirmResult === true
            if (!confirmed) {
              return
            }
            selectedPicId =
              typeof confirmResult === 'object' && confirmResult.value
                ? Number(confirmResult.value)
                : null
            cascadeSelection =
              typeof confirmResult === 'object' ? confirmResult.checklist || null : null
          }
        } catch (err) {
          console.error('Failed to load PIC list:', err)
        }
      }

      if (selectedPicId == null) {
        const confirmResult = await dialog.confirm(
          'Sync the latest client details into this quotation?\n\nThis will only update this document and will not affect past copies.',
          {
            title: 'Sync Client Details',
            confirmText: 'Sync',
            cancelText: 'Cancel',
            ...(checklistOptions
              ? {
                  checklist: checklistOptions,
                  acknowledge: {
                    label: 'I understand this will update the selected documents.',
                    required: true,
                  },
                }
              : {}),
          },
        )
        const confirmed =
          typeof confirmResult === 'object'
            ? confirmResult.confirmed === true
            : confirmResult === true
        if (!confirmed) return
        cascadeSelection =
          typeof confirmResult === 'object' ? confirmResult.checklist || null : null
      }

      try {
        const result = await fetchJsonCompat(urls.syncClient(record.id), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_id: record.id,
            id: record.id,
            pic_id: selectedPicId,
            cascade: cascadeSelection || undefined,
          }),
        })
        if (isSuccess(result)) {
          await fetchQuotes()
          dialog.alert(getMessage(result, 'Client details synced successfully.'))
        } else {
          dialog.alert(getMessage(result, 'Failed to sync client details.'))
        }
      } catch (err) {
        console.error('Sync client details error:', err)
        dialog.alert(err?.message || 'An error occurred while syncing client details.')
      }
    },
  }
}
