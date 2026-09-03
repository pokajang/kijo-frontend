import { describe, expect, it } from 'vitest'
import {
  getValidationErrorMap,
  validateIhTemplate,
  validateManpowerTemplate,
  validateSpecialTemplate,
  validateTrainingTemplate,
} from './templateValidation'

const messages = (errors) => errors.map((error) => error.message)

describe('templateValidation', () => {
  it('validates required training fields and agenda time order', () => {
    const errors = validateTrainingTemplate({
      templateDetails: { trainingTitle: '', trainingCode: '', duration: '' },
      agendaRows: [{ day: 1, start: '10:00', end: '09:00', topic: 'Topic' }],
      remarks: '',
    })

    expect(messages(errors)).toEqual(
      expect.arrayContaining([
        'Training title is required.',
        'Training code is required.',
        'Training duration is required.',
        'Introduction is required.',
        'Objectives is required.',
        'Internal change note is required.',
        'Agenda Day 1, row 1 start time must be before end time.',
      ]),
    )
  })

  it('validates training backend limits before submit', () => {
    const errors = validateTrainingTemplate({
      templateDetails: {
        trainingTitle: 'A'.repeat(256),
        trainingCode: 'B'.repeat(51),
        hrdNo: 'C'.repeat(21),
        lectureMedium: 'D'.repeat(256),
        duration: '1day',
        introduction: '<p>Intro</p>',
        objectives: '<p>Objectives</p>',
      },
      agendaRows: [{ day: 1, start: '09:00', end: '10:00', topic: 'T'.repeat(501) }],
      remarks: '<p>R</p>',
    })

    expect(messages(errors)).toEqual(
      expect.arrayContaining([
        'Training title must be 255 characters or fewer.',
        'Training code must be 50 characters or fewer.',
        'HRD program number must be 20 characters or fewer.',
        'Lecture medium must be 255 characters or fewer.',
        'Agenda Day 1, row 1 topic must be 500 characters or fewer.',
      ]),
    )
  })

  it('requires at least one complete training agenda row', () => {
    const errors = validateTrainingTemplate({
      templateDetails: {
        trainingTitle: 'Safety',
        trainingCode: 'SAFE',
        duration: '1day',
        introduction: '<p>Intro</p>',
        objectives: '<p>Objectives</p>',
      },
      agendaRows: [],
      remarks: '<p>new</p>',
    })

    expect(messages(errors)).toContain('At least one complete agenda row is required.')
  })

  it('validates IH has title, code, remarks, and at least one content section', () => {
    const errors = validateIhTemplate({
      templateDetails: { serviceTitle: '', serviceCode: '', introduction: '<p><br></p>' },
      remarks: '',
    })

    expect(messages(errors)).toEqual(
      expect.arrayContaining([
        'Service title is required.',
        'Service code is required.',
        'Introduction is required.',
        'Internal change note is required.',
        'At least one IH proposal content section is required.',
      ]),
    )
  })

  it('validates manpower has title, code, remarks, and content', () => {
    const errors = validateManpowerTemplate({
      templateDetails: {
        serviceTitle: '',
        serviceCode: '',
        introduction: '',
        serviceDeliverables: '',
      },
      remarks: '',
    })

    expect(messages(errors)).toEqual(
      expect.arrayContaining(['Introduction is required.', 'Service deliverables is required.']),
    )
    expect(messages(errors)).toContain(
      'At least one manpower proposal content section is required.',
    )
  })

  it('validates special upload and write modes', () => {
    expect(
      messages(
        validateSpecialTemplate({
          template: { proposalMode: 'upload', serviceTitle: 'A', serviceCode: 'B' },
          remarks: '<p>remark</p>',
          newAttachments: [],
          existingAttachments: [],
        }),
      ),
    ).toEqual(
      expect.arrayContaining(['At least one PDF proposal attachment is required in upload mode.']),
    )

    expect(
      messages(
        validateSpecialTemplate({
          template: { proposalMode: 'upload', serviceTitle: 'A', serviceCode: 'B' },
          remarks: '<p>remark</p>',
          isEdit: true,
          newAttachments: [],
          existingAttachments: [{ fileName: 'legacy.jpg', mimeType: 'image/jpeg' }],
        }),
      ),
    ).toContain('At least one PDF proposal attachment is required in upload mode.')

    expect(
      messages(
        validateSpecialTemplate({
          template: { proposalMode: 'write', serviceTitle: 'A', serviceCode: 'B' },
          remarks: '<p>remark</p>',
        }),
      ),
    ).toContain('Proposal content is required.')
  })

  it('limits the upload-mode internal reference note to 300 characters', () => {
    const common = {
      categoryId: 1,
      proposalMode: 'upload',
      serviceTitle: 'A',
      serviceCode: 'B',
    }
    const attachment = { fileName: 'proposal.pdf', mimeType: 'application/pdf' }

    expect(
      messages(
        validateSpecialTemplate({
          template: { ...common, serviceSummary: 'A'.repeat(300) },
          remarks: '<p>remark</p>',
          isEdit: true,
          existingAttachments: [attachment],
        }),
      ),
    ).not.toContain('Internal reference note must be 300 characters or fewer.')

    expect(
      messages(
        validateSpecialTemplate({
          template: { ...common, serviceSummary: 'A'.repeat(301) },
          remarks: '<p>remark</p>',
          isEdit: true,
          existingAttachments: [attachment],
        }),
      ),
    ).toContain('Internal reference note must be 300 characters or fewer.')
  })

  it('treats a missing special proposal mode as write mode', () => {
    const errors = validateSpecialTemplate({
      template: { categoryId: 1, serviceTitle: 'A', serviceCode: 'B' },
      remarks: '<p>remark</p>',
    })

    expect(messages(errors)).toContain('Proposal content is required.')
    expect(messages(errors)).not.toContain(
      'At least one PDF proposal attachment is required in upload mode.',
    )
  })

  it('validates special default line items', () => {
    const errors = validateSpecialTemplate({
      template: {
        proposalMode: 'write',
        serviceTitle: 'A',
        serviceCode: 'B',
        proposalContent: '<p>Content</p>',
        defaultLineItems: [{ title: '', quantity: 0, unitPrice: -1 }],
      },
      remarks: '<p>remark</p>',
    })

    expect(messages(errors)).toEqual(
      expect.arrayContaining([
        'Default line item 1 title is required.',
        'Default line item 1 quantity must be greater than 0.',
        'Default line item 1 unit price cannot be negative.',
      ]),
    )
  })

  it('requires a category for special proposals', () => {
    const errors = validateSpecialTemplate({
      template: {
        proposalMode: 'write',
        serviceTitle: 'Engineering Service',
        serviceCode: 'ENG-1',
        proposalContent: '<p>Content</p>',
      },
      remarks: '<p>Created</p>',
    })

    expect(messages(errors)).toContain('Service category is required.')
  })

  it('maps validation errors by field for inline display', () => {
    expect(
      getValidationErrorMap([
        { field: 'trainingTitle', message: 'Title required.' },
        { field: 'trainingTitle', message: 'Title too long.' },
        { field: 'agenda.0', message: 'Agenda invalid.' },
      ]),
    ).toEqual({
      trainingTitle: 'Title required.',
      'agenda.0': 'Agenda invalid.',
    })
  })
})
