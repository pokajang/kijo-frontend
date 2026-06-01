import { describe, expect, it } from 'vitest'

import {
  canPreviewRecordProposal,
  getRecordProposal,
  getRecordProposalChipText,
  getRecordProposalLanguageLabel,
  isProposalAttached,
} from './recordProposal'

describe('recordProposal helpers', () => {
  it('reads the normalized proposal payload as the canonical contract', () => {
    const record = {
      proposalId: 99,
      proposal: {
        attachedToPdf: true,
        templateType: 'training',
        templateId: 12,
        title: 'Office Tinting Service',
        language: 'ms-MY',
        canPreviewInline: true,
      },
    }

    expect(getRecordProposal(record)).toEqual({
      attachedToPdf: true,
      templateType: 'training',
      templateId: 12,
      title: 'Office Tinting Service',
      language: 'ms-MY',
      canPreviewInline: true,
    })
    expect(isProposalAttached(record)).toBe(true)
    expect(canPreviewRecordProposal(record)).toBe(true)
    expect(getRecordProposalLanguageLabel(record)).toBe('Bahasa Melayu')
  })

  it('does not infer previewable proposal linkage from legacy ids', () => {
    expect(canPreviewRecordProposal({ proposalId: 7, attachProposal: true })).toBe(false)
    expect(getRecordProposal({ formData: { serviceId: 8 } }).templateId).toBeNull()
  })

  it('requires a canonical type and id before allowing inline preview', () => {
    expect(
      canPreviewRecordProposal({
        proposal: {
          attachedToPdf: true,
          templateType: 'training',
          templateId: null,
          canPreviewInline: true,
        },
      }),
    ).toBe(false)
  })

  it('renders chip copy for attached, linked, attached-without-template, and no-proposal states', () => {
    expect(
      getRecordProposalChipText({
        proposal: {
          attachedToPdf: true,
          title: 'Office Tinting Service',
          canPreviewInline: true,
        },
      }),
    ).toBe('Office Tinting Service attached to this quote')

    expect(
      getRecordProposalChipText({
        proposal: {
          attachedToPdf: false,
          title: 'Office Tinting Service',
          canPreviewInline: true,
        },
      }),
    ).toBe('Office Tinting Service linked to this quote')

    expect(
      getRecordProposalChipText({
        proposal: {
          attachedToPdf: true,
          title: null,
          canPreviewInline: false,
        },
      }),
    ).toBe('Proposal attached to this quote')

    expect(getRecordProposalChipText({ proposal: null })).toBe('No proposal linked to this quote')
  })

  it('does not label a missing template row as no proposal when a canonical link exists', () => {
    expect(
      getRecordProposalChipText({
        proposal: {
          attachedToPdf: false,
          templateType: 'training',
          templateId: 12,
          title: null,
          canPreviewInline: false,
        },
      }),
    ).toBe('Proposal linked to this quote')
  })
})
