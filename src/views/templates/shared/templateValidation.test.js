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
        'Remarks is required.',
        'Agenda Day 1, row 1 start time must be before end time.',
      ]),
    )
  })

  it('validates training backend limits before submit', () => {
    const errors = validateTrainingTemplate({
      templateDetails: {
        trainingTitle: 'A'.repeat(256),
        trainingCode: 'B'.repeat(101),
        hrdNo: 'C'.repeat(101),
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
        'Training code must be 100 characters or fewer.',
        'HRD program number must be 100 characters or fewer.',
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
        'Remarks is required.',
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
      expect.arrayContaining([
        'Service summary is required.',
        'At least one proposal attachment is required in upload mode.',
      ]),
    )

    expect(
      messages(
        validateSpecialTemplate({
          template: { proposalMode: 'write', serviceTitle: 'A', serviceCode: 'B' },
          remarks: '<p>remark</p>',
        }),
      ),
    ).toContain('Proposal content is required.')
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
