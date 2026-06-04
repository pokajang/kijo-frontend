// src/views/crm/quotes/special/formHandlers.js

import { useState, useEffect } from 'react'
import { isQuoteResultSuccess, quoteApiUrl } from '../quoteApi'

export function useSpecialDetailsForm(formData, setFormData, isEditMode, proposalLanguage = 'en') {
  const [templates, setTemplates] = useState([])

  // 1) load available service templates
  useEffect(() => {
    const query = new URLSearchParams({ language: proposalLanguage })
    fetch(quoteApiUrl(`proposal-templates/special/list?${query.toString()}`), {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((j) => {
        const rows = Array.isArray(j) ? j : Array.isArray(j?.data) ? j.data : []
        if (isQuoteResultSuccess(j)) {
          setTemplates(rows)
        } else {
          console.error('Unexpected templates response', j)
        }
      })
      .catch((e) => console.error('Failed to load templates', e))
  }, [proposalLanguage])

  useEffect(() => {
    if (isEditMode || formData.specialId || templates.length === 0) {
      return
    }

    const draftTitle = String(formData.serviceTitle || '').trim()
    const draftCode = String(formData.serviceCode || '').trim()
    if (!draftTitle && !draftCode) return

    const matchingTemplates = templates.filter((template) => {
      const sameTitle = !draftTitle || template.serviceTitle === draftTitle
      const sameCode = !draftCode || template.serviceCode === draftCode
      return sameTitle && sameCode
    })
    if (matchingTemplates.length !== 1) return

    const [matchingTemplate] = matchingTemplates
    setFormData((prev) => {
      if (prev.specialId) return prev

      const currentTitle = String(prev.serviceTitle || '').trim()
      const currentCode = String(prev.serviceCode || '').trim()
      if ((draftTitle && currentTitle !== draftTitle) || (draftCode && currentCode !== draftCode)) {
        return prev
      }

      return {
        ...prev,
        specialId: matchingTemplate.id,
        serviceTitle: matchingTemplate.serviceTitle,
        serviceCode: matchingTemplate.serviceCode,
      }
    })
  }, [
    formData.serviceCode,
    formData.serviceTitle,
    formData.specialId,
    isEditMode,
    setFormData,
    templates,
  ])

  // 2) when template changes, fetch previously used line items, sort, and auto-load them
  useEffect(() => {
    if (!formData.specialId) {
      return
    }

    let isActive = true
    const serviceId = formData.specialId
    const endpoint = quoteApiUrl(
      `quote-records/special/line-items?service_id=${encodeURIComponent(serviceId)}`,
    )

    fetch(endpoint, { credentials: 'include' })
      .then((r) => r.json())
      .then((items) => {
        if (!isActive) return
        const rows = Array.isArray(items) ? items : Array.isArray(items?.data) ? items.data : []
        const normalized = rows.map((item, idx) => {
          const candidateId = Number(item.id ?? item.line_item_id ?? idx)
          return {
            ...item,
            __sortId: Number.isNaN(candidateId) ? idx : candidateId,
          }
        })

        normalized.sort((a, b) => a.__sortId - b.__sortId)

        if (!isEditMode && normalized.length > 0) {
          setFormData((prev) => {
            if (prev.specialId !== serviceId) {
              // stale fetch result
              return prev
            }

            if (Array.isArray(prev.lineItems) && prev.lineItems.length > 0) {
              // respect existing draft rows
              return prev
            }

            const lineItems = normalized.map((item) => {
              const quantity = parseFloat(item.quantity ?? 1) || 1
              const unitPrice = parseFloat(item.unit_price ?? item.unitPrice ?? 0) || 0
              return {
                title: item.title || '',
                description: item.description || '',
                unit: item.unit || '',
                quantity,
                unitPrice,
                amount: parseFloat((quantity * unitPrice).toFixed(2)),
              }
            })

            return {
              ...prev,
              lineItems,
            }
          })
        }
      })
      .catch((e) => {
        console.error('Failed to load suggestions', e)
      })

    return () => {
      isActive = false
    }
  }, [formData.specialId, isEditMode, setFormData])

  // 3) handlers

  // When user selects a service template
  const handleTemplateSelect = (e) => {
    const id = parseInt(e.target.value, 10) || null
    const sel = templates.find((t) => Number(t.id) === id) || {}
    setFormData((p) => ({
      ...p,
      specialId: id,
      serviceTitle: sel.serviceTitle || '',
      serviceCode: sel.serviceCode || '',
      lineItems: [], // reset items when changing template
    }))
  }

  // Add a completely blank row
  const handleAddBlank = () => {
    setFormData((p) => ({
      ...p,
      lineItems: [
        ...(p.lineItems || []),
        {
          title: '',
          description: '',
          unit: '',
          quantity: 1,
          unitPrice: 0,
          amount: 0, // initial line total as number
        },
      ],
    }))
  }

  // Edit any field on a line item (title, description, unit)
  const handleLineItemChange = (idx, field, val) => {
    const items = [...(formData.lineItems || [])]
    items[idx] = { ...items[idx], [field]: val }
    setFormData((p) => ({ ...p, lineItems: items }))
  }

  // Remove a line item
  const handleRemove = (idx) => {
    const items = [...(formData.lineItems || [])]
    items.splice(idx, 1)
    setFormData((p) => ({ ...p, lineItems: items }))
  }

  return {
    templates,
    handleTemplateSelect,
    handleAddBlank,
    handleLineItemChange,
    handleRemove,
  }
}
