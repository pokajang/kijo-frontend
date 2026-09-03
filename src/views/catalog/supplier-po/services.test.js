import { describe, expect, it } from 'vitest'

import {
  buildSupplierPoItemPayload,
  buildSupplierPoQuotationRemarks,
  findEquipmentSnapshotItem,
  getOptionProjectId,
  normalizeSupplierPoProjectOptions,
  resolveHydratedProjectOption,
} from './services'

describe('supplier PO equipment snapshot helpers', () => {
  it('replaces a route-only project stub with the fully loaded project', () => {
    const stub = { label: 'Project #12', value: { project_id: 12 } }
    const loaded = {
      label: 'Equipment Project',
      value: {
        project_id: 12,
        project_type: 'Equipment Supply',
        quotation_remarks: 'Deliver together.',
        equipment_items: [],
      },
    }

    expect(resolveHydratedProjectOption([loaded], stub)).toBe(loaded)
  })

  it('treats missing initial options and malformed option rows as normal states', () => {
    expect(getOptionProjectId(null)).toBeUndefined()
    expect(getOptionProjectId(undefined)).toBeUndefined()
    expect(resolveHydratedProjectOption(null, null)).toBeNull()
    expect(resolveHydratedProjectOption([null], undefined)).toBeNull()
  })

  it('normalizes supported project responses without retaining malformed rows', () => {
    expect(normalizeSupplierPoProjectOptions([])).toEqual([])
    expect(
      normalizeSupplierPoProjectOptions([
        { id: 12, project_name: 'Alpha' },
        null,
        { project_id: 13 },
        {},
      ]),
    ).toEqual([
      expect.objectContaining({
        label: 'Alpha',
        value: expect.objectContaining({ project_id: 12 }),
      }),
      expect.objectContaining({
        label: 'Project #13',
        value: expect.objectContaining({ project_id: 13 }),
      }),
    ])
    expect(
      normalizeSupplierPoProjectOptions({ data: [{ project_id: 14, projectName: 'Bravo' }] }),
    ).toEqual([
      expect.objectContaining({
        label: 'Bravo',
        value: expect.objectContaining({ project_id: 14 }),
      }),
    ])
  })

  it('rejects an unsupported project response instead of treating it as an empty list', () => {
    expect(() => normalizeSupplierPoProjectOptions({ status: 'success', data: {} })).toThrow(
      'unsupported response',
    )
  })

  it('matches quoted equipment by every supported catalogue ID shape', () => {
    const quoted = { catalog_item_id: 701, item_remarks: 'Matte navy finish.' }

    expect(findEquipmentSnapshotItem({ equipment_items: [quoted] }, { id: 701 })).toBe(quoted)
  })

  it('omits unknown blank remarks so the backend can restore its snapshot', () => {
    expect(buildSupplierPoQuotationRemarks({ project_type: 'Equipment Supply' }, '')).toEqual({})
    expect(
      buildSupplierPoItemPayload({
        item: { id: 701, item_name: 'Gas detector', description: 'Catalogue text' },
        snapshotItem: null,
        quantity: 1,
        unitPrice: 100,
      }),
    ).not.toHaveProperty('item_remarks')
  })

  it('preserves explicit snapshot remarks, including an intentional blank', () => {
    expect(
      buildSupplierPoQuotationRemarks(
        { project_type: 'Equipment Supply', quotation_remarks: 'Original' },
        '',
      ),
    ).toEqual({ quotation_remarks: '' })
    expect(
      buildSupplierPoItemPayload({
        item: { id: 701, item_name: 'Gas detector' },
        snapshotItem: { item_name: 'Gas detector', item_remarks: '' },
        quantity: 1,
        unitPrice: 100,
      }),
    ).toHaveProperty('item_remarks', '')
  })
})
