// src/views/crm/quotes/special/formHandlers.js

import { useState, useEffect } from 'react'
import { isQuoteResultSuccess, quoteApiUrl } from '../quoteApi'

export function useSpecialDetailsForm(
  formData,
  setFormData,
  isEditMode,
  proposalLanguage = 'en',
  createdProposalTemplate = null,
  onCreatedProposalTemplateConsumed,
  specialCategoryId = null,
) {
  const [templates, setTemplates] = useState([])
  const [templatesLoaded, setTemplatesLoaded] = useState(false)

  // 1) load available service templates
  useEffect(() => {
    let cancelled = false
    setTemplatesLoaded(false)
    setTemplates([])
    const query = new URLSearchParams({ language: proposalLanguage })
    if (specialCategoryId) query.set('category_id', String(specialCategoryId))
    fetch(quoteApiUrl(`proposal-templates/special/list?${query.toString()}`), {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((j) => {
        const rows = Array.isArray(j) ? j : Array.isArray(j?.data) ? j.data : []
        if (isQuoteResultSuccess(j)) {
          if (!cancelled) setTemplates(rows)
        } else {
          console.error('Unexpected templates response', j)
        }
      })
      .catch((e) => console.error('Failed to load templates', e))
      .finally(() => {
        if (!cancelled) setTemplatesLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [proposalLanguage, specialCategoryId])

  useEffect(() => {
    if (!createdProposalTemplate || isEditMode) return
    if (
      createdProposalTemplate.serviceKey !== 'special' ||
      createdProposalTemplate.proposalLanguage !== proposalLanguage ||
      (createdProposalTemplate.specialCategoryId &&
        Number(createdProposalTemplate.specialCategoryId) !== Number(specialCategoryId))
    ) {
      onCreatedProposalTemplateConsumed?.()
      return
    }
    if (!templatesLoaded) return

    const selected = templates.find(
      (template) => Number(template.id) === Number(createdProposalTemplate.templateId),
    )
    if (!selected) {
      onCreatedProposalTemplateConsumed?.(
        'The new Special Service proposal template could not be loaded. Refresh the list or select it manually.',
      )
      return
    }

    const defaultLineItems = Array.isArray(selected.defaultLineItems)
      ? selected.defaultLineItems
      : []
    setFormData((prev) => ({
      ...prev,
      specialId: selected.id,
      serviceTitle: selected.serviceTitle || '',
      serviceCode: selected.serviceCode || '',
      proposalMode: selected.proposalMode || '',
      hasAppendableProposal: Boolean(selected.hasAppendableProposal),
      appendablePdfCount: Number(selected.appendablePdfCount || 0),
      hasWrittenProposalContent: Boolean(selected.hasWrittenProposalContent),
      appendableProposalMessage: selected.appendableProposalMessage || '',
      attachProposal: selected.hasAppendableProposal ? prev.attachProposal : false,
      lineItems: defaultLineItems.map((item) => {
        const quantity = Number(item.quantity) || 1
        const unitPrice = Number(item.unitPrice) || 0
        return {
          title: item.title || '',
          description: item.description || '',
          unit: item.unit || '',
          quantity,
          unitPrice,
          amount: Number.isFinite(Number(item.amount))
            ? Number(item.amount)
            : Number((quantity * unitPrice).toFixed(2)),
        }
      }),
    }))
    onCreatedProposalTemplateConsumed?.()
  }, [
    createdProposalTemplate,
    isEditMode,
    onCreatedProposalTemplateConsumed,
    proposalLanguage,
    specialCategoryId,
    setFormData,
    templates,
    templatesLoaded,
  ])

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

  useEffect(() => {
    if (!formData.specialId || templates.length === 0) {
      return
    }

    const selectedTemplate = templates.find(
      (template) => Number(template.id) === Number(formData.specialId),
    )
    if (!selectedTemplate) {
      return
    }

    setFormData((prev) => {
      if (Number(prev.specialId) !== Number(selectedTemplate.id)) {
        return prev
      }

      const hasAppendableProposal = Boolean(selectedTemplate.hasAppendableProposal)
      const next = {
        ...prev,
        proposalMode: selectedTemplate.proposalMode || '',
        hasAppendableProposal,
        appendablePdfCount: Number(selectedTemplate.appendablePdfCount || 0),
        hasWrittenProposalContent: Boolean(selectedTemplate.hasWrittenProposalContent),
        appendableProposalMessage: selectedTemplate.appendableProposalMessage || '',
        attachProposal: hasAppendableProposal ? prev.attachProposal : false,
      }

      if (
        next.proposalMode === prev.proposalMode &&
        next.hasAppendableProposal === prev.hasAppendableProposal &&
        next.appendablePdfCount === prev.appendablePdfCount &&
        next.hasWrittenProposalContent === prev.hasWrittenProposalContent &&
        next.appendableProposalMessage === prev.appendableProposalMessage &&
        next.attachProposal === prev.attachProposal
      ) {
        return prev
      }

      return next
    })
  }, [formData.specialId, setFormData, templates])

  // 2) handlers

  // When user selects a service template
  const handleTemplateSelect = (e) => {
    const id = parseInt(e.target.value, 10) || null
    const sel = templates.find((t) => Number(t.id) === id) || {}
    const defaultLineItems = Array.isArray(sel.defaultLineItems) ? sel.defaultLineItems : []
    const lineItems = defaultLineItems.map((item) => {
      const quantity = Number(item.quantity) || 1
      const unitPrice = Number(item.unitPrice) || 0
      return {
        title: item.title || '',
        description: item.description || '',
        unit: item.unit || '',
        quantity,
        unitPrice,
        amount: Number.isFinite(Number(item.amount))
          ? Number(item.amount)
          : parseFloat((quantity * unitPrice).toFixed(2)),
      }
    })
    setFormData((p) => ({
      ...p,
      specialId: id,
      serviceTitle: sel.serviceTitle || '',
      serviceCode: sel.serviceCode || '',
      proposalMode: sel.proposalMode || '',
      hasAppendableProposal: Boolean(sel.hasAppendableProposal),
      appendablePdfCount: Number(sel.appendablePdfCount || 0),
      hasWrittenProposalContent: Boolean(sel.hasWrittenProposalContent),
      appendableProposalMessage: sel.appendableProposalMessage || '',
      attachProposal: sel.hasAppendableProposal ? p.attachProposal : false,
      lineItems,
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
