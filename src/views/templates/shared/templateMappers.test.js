import { describe, expect, it } from 'vitest'
import {
  fromApiIhTemplate,
  fromApiManpowerTemplate,
  fromApiSpecialTemplate,
  fromApiTrainingAgenda,
  fromApiTrainingTemplate,
  appendSpecialTemplateFormData,
  toApiTrainingTemplate,
} from './templateMappers'

describe('templateMappers', () => {
  it('maps training API aliases into form state', () => {
    expect(
      fromApiTrainingTemplate({
        training_title: 'Safety',
        training_code: 'SAFE',
        hrd_no: 'HRD1',
        additional_requirements: 'Harness',
        methodTheory: 1,
        methodPractical: 0,
        agenda: [{ day: 2 }],
      }),
    ).toMatchObject({
      trainingTitle: 'Safety',
      trainingCode: 'SAFE',
      hrdNo: 'HRD1',
      additionalTrainingRequirements: 'Harness',
      method_theory: true,
      method_practical: false,
      duration: '2day',
    })
  })

  it('maps training agenda and payload compatibility fields', () => {
    expect(
      fromApiTrainingAgenda([{ day: 1, start_time: '09:00:00', end_time: '10:00:00' }]),
    ).toEqual([{ day: 1, start: '09:00', end: '10:00', topic: '' }])

    expect(
      toApiTrainingTemplate({
        templateDetails: { additionalTrainingRequirements: 'Projector', method_theory: true },
        agenda: [],
        remarks: 'updated',
        isEdit: true,
        id: 7,
      }),
    ).toMatchObject({
      additionalRequirements: 'Projector',
      methodTheory: 1,
      id: 7,
      template_id: 7,
      proposal_id: 7,
      remarks: 'updated',
    })
  })

  it('maps IH and manpower API aliases', () => {
    expect(
      fromApiIhTemplate({
        service_title: 'IH',
        service_code: 'IH01',
        work_scope: 'Scope',
        other_fields: 'Other',
      }),
    ).toMatchObject({
      serviceTitle: 'IH',
      serviceCode: 'IH01',
      workScope: 'Scope',
      otherFields: 'Other',
    })

    expect(
      fromApiManpowerTemplate({
        service_title: 'Manpower',
        service_code: 'MP01',
        service_deliverables: 'Deliver',
        supplied_manpower_deliverables: 'Supply',
        custom_section: 'Custom',
      }),
    ).toMatchObject({
      serviceTitle: 'Manpower',
      serviceCode: 'MP01',
      serviceDeliverables: 'Deliver',
      suppliedManpowerDeliverables: 'Supply',
      customSection: 'Custom',
    })
  })

  it('maps special upload versus write mode', () => {
    expect(fromApiSpecialTemplate({ content: 'Summary', attachments: [{ id: 1 }] })).toMatchObject({
      proposalMode: 'upload',
      serviceSummary: 'Summary',
      proposalContent: '',
    })

    expect(fromApiSpecialTemplate({ content: 'Written', attachments: [] })).toMatchObject({
      proposalMode: 'write',
      proposalContent: 'Written',
    })

    expect(
      fromApiSpecialTemplate({
        proposal_mode: 'write',
        category_id: 3,
        category_name: 'Engineering',
        service_summary: 'Internal',
        proposal_content: 'Written body',
        attachments: [{ id: 1 }],
        defaultLineItems: [{ title: 'Audit', quantity: 1 }],
      }),
    ).toMatchObject({
      proposalMode: 'write',
      categoryId: 3,
      categoryName: 'Engineering',
      serviceSummary: 'Internal',
      proposalContent: 'Written body',
      defaultLineItems: [{ title: 'Audit', quantity: 1 }],
    })

    expect(
      fromApiSpecialTemplate({ service_title: 'Special', service_code: 'sp01' }),
    ).toMatchObject({
      serviceTitle: 'Special',
      serviceCode: 'SP01',
    })
  })

  it('omits inactive special rich-text fields from FormData', () => {
    const formData = appendSpecialTemplateFormData({
      formData: new FormData(),
      template: {
        proposalMode: 'write',
        categoryId: 3,
        serviceTitle: 'Special',
        serviceCode: 'SP01',
        serviceSummary: '<p>Inactive</p>',
        proposalContent: '<p>Active</p>',
        defaultLineItems: [{ title: 'Audit', quantity: 2, unitPrice: 100 }],
      },
      remarks: 'ok',
    })

    expect(formData.get('content')).toBe('<p>Active</p>')
    expect(formData.get('categoryId')).toBe('3')
    expect(formData.get('serviceSummary')).toBe('')
    expect(formData.get('proposalContent')).toBe('<p>Active</p>')
    expect(JSON.parse(formData.get('defaultLineItems'))).toEqual([
      { title: 'Audit', quantity: 2, unitPrice: 100 },
    ])
  })
})
