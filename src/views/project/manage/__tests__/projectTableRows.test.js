import { describe, expect, it } from 'vitest'

import { dataColumns } from '../projectTableColumns'
import { emptyProjectTableValue, normalizeProjectTableRows } from '../projectTableRows'

describe('projectTableRows', () => {
  it('normalizes project table display fields without changing source fields', () => {
    const [row] = normalizeProjectTableRows([
      {
        id: 1,
        client_name: 'Client A',
        project_name: 'Project Alpha',
        project_type: 'Training',
        quote_value: '1234.5',
        award_date: '2026-05-29T10:00:00Z',
        status: 'Active',
        closing_details: { close_date: '2026-06-01 09:00:00' },
        assigned_staff: [
          { project_role: 'Member', name_code: 'MBR' },
          { project_role: 'Leader', name_code: 'LDR' },
        ],
        vendors: [
          {
            vendor_name: 'Vendor A',
            contact_person_name: 'Alice',
            mobile_number: '123',
            email: 'alice@example.com',
          },
          {
            vendor_name: 'Vendor B',
            contact_person_name: 'Bob',
            mobile_number: '456',
            email: 'bob@example.com',
          },
        ],
        progress_updates: [
          {
            progress_date: '2026-05-01',
            progress_text: 'Old update',
          },
          {
            updated_on: '2026-05-20T08:00:00Z',
            progress_text: 'Latest update',
          },
        ],
      },
    ])

    expect(row).toEqual(
      expect.objectContaining({
        id: 1,
        client: 'Client A',
        project: 'Project Alpha',
        projectType: 'Training',
        value: 1234.5,
        valueDisplay: '1,234.50',
        update: '2026-05-20T08:00:00Z',
        updateDisplay: '2026-05-20',
        updateText: 'Latest update',
        updateFullText: '2026-05-20 Latest update',
        owner: 'LDR',
        vendor: 'Vendor A, Vendor B',
        vendorContactName: 'Alice, Bob',
        vendorMobile: '123, 456',
        vendorEmail: 'alice@example.com, bob@example.com',
        award: '2026-05-29T10:00:00Z',
        awardDisplay: '2026-05-29',
        status: 'Active',
        closed: '2026-06-01 09:00:00',
        closedDisplay: '2026-06-01',
      }),
    )
  })

  it('uses empty display fallbacks for missing optional values', () => {
    const [row] = normalizeProjectTableRows([{ id: 2 }])

    expect(row).toEqual(
      expect.objectContaining({
        client: emptyProjectTableValue,
        project: emptyProjectTableValue,
        projectType: emptyProjectTableValue,
        value: null,
        valueDisplay: emptyProjectTableValue,
        update: '',
        updateDisplay: emptyProjectTableValue,
        updateText: emptyProjectTableValue,
        updateFullText: emptyProjectTableValue,
        owner: emptyProjectTableValue,
        vendor: emptyProjectTableValue,
        vendorContactName: emptyProjectTableValue,
        vendorMobile: emptyProjectTableValue,
        vendorEmail: emptyProjectTableValue,
        award: '',
        awardDisplay: emptyProjectTableValue,
        status: emptyProjectTableValue,
        closed: '',
        closedDisplay: emptyProjectTableValue,
      }),
    )
  })

  it('labels project value as RM while preserving dense numeric value display', () => {
    const valueColumn = dataColumns.find((column) => column.key === 'value')
    const [row] = normalizeProjectTableRows([{ id: 3, quote_value: '1234.5' }])

    expect(valueColumn).toEqual(expect.objectContaining({ label: 'Value (RM)' }))
    expect(row.valueDisplay).toBe('1,234.50')
  })

  it('uses current project value when a project value revision exists', () => {
    const [row] = normalizeProjectTableRows([
      { id: 4, quote_value: '1000', current_project_value: '1250' },
    ])

    expect(row.value).toBe(1250)
    expect(row.valueDisplay).toBe('1,250.00')
  })
})
