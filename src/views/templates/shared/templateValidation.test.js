import { describe, expect, it } from 'vitest'
import {
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
        'Remarks is required.',
        'Agenda Day 1, row 1 start time must be before end time.',
      ]),
    )
  })

  it('requires at least one complete training agenda row', () => {
    const errors = validateTrainingTemplate({
      templateDetails: { trainingTitle: 'Safety', trainingCode: 'SAFE', duration: '1day' },
      agendaRows: [],
      remarks: 'new',
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
        'Remarks is required.',
        'At least one IH proposal content section is required.',
      ]),
    )
  })

  it('validates manpower has title, code, remarks, and content', () => {
    const errors = validateManpowerTemplate({
      templateDetails: { serviceTitle: '', serviceCode: '', serviceDeliverables: '' },
      remarks: '',
    })

    expect(messages(errors)).toContain(
      'At least one manpower proposal content section is required.',
    )
  })

  it('validates special upload and write modes', () => {
    expect(
      messages(
        validateSpecialTemplate({
          template: { proposalMode: 'upload', serviceTitle: 'A', serviceCode: 'B' },
          remarks: 'remark',
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
          remarks: 'remark',
        }),
      ),
    ).toContain('Proposal content is required.')
  })
})
