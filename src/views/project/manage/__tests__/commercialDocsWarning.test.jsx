import { describe, expect, it } from 'vitest'

import {
  buildProjectCommercialDocGroups,
  filterProjectCommercialDocGroups,
} from '../commercialDocsWarning'

const docs = {
  invoices: [{ id: 1, invoice_ref_no: 'INV-1' }],
  delivery_orders: [{ id: 2, do_number: 'DO-1' }],
  jd14: [{ id: 3, approval_no: 'JD14-1' }],
  vendor_loas: [{ id: 4, loa_ref_no: 'LOA-1' }],
  vendor_payments: [{ id: 5, amount: 10 }],
  supplier_pos: [{ po_id: 6, po_ref_no: 'PO-1' }],
}

describe('commercialDocsWarning group filtering', () => {
  it('builds all existing commercial document groups by default', () => {
    const groups = buildProjectCommercialDocGroups(docs)

    expect(groups.map((group) => group.key)).toEqual([
      'invoices',
      'delivery-orders',
      'jd14',
      'vendor-loas',
      'vendor-payments',
      'supplier-pos',
    ])
  })

  it('filters warnings to the requested document type', () => {
    const groups = buildProjectCommercialDocGroups(docs)

    expect(filterProjectCommercialDocGroups(groups, 'invoices').map((group) => group.key)).toEqual([
      'invoices',
    ])
    expect(filterProjectCommercialDocGroups(groups, 'jd14').map((group) => group.key)).toEqual([
      'jd14',
    ])
    expect(
      filterProjectCommercialDocGroups(groups, 'delivery-orders').map((group) => group.key),
    ).toEqual(['delivery-orders'])
  })

  it('builds document links for commercial detail routes', () => {
    const groups = buildProjectCommercialDocGroups(docs)
    const firstItemByGroup = Object.fromEntries(groups.map((group) => [group.key, group.items[0]]))

    expect(firstItemByGroup.invoices.href).toBe('/commercial/invoice/1')
    expect(firstItemByGroup['delivery-orders'].href).toBe('/commercial/delivery-order/2')
    expect(firstItemByGroup.jd14.href).toBe('/commercial/jd14/3')
    expect(firstItemByGroup['vendor-loas'].href).toBe('/commercial/vendor-loa/4')
    expect(firstItemByGroup['supplier-pos'].href).toBe('/commercial/supplier-po/6')
  })
})
