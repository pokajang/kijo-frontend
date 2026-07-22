import { describe, expect, it } from 'vitest'

import {
  applyProjectFilters,
  getLatestProgressUpdate,
  getInquirySourceOptions,
  getOwnerOptions,
  getProjectTypeOptions,
  getYearOptions,
  isProjectOwnedByUser,
} from '../projectFilters'

const defaultFilters = {
  yearFilter: 'all',
  statusFilter: 'all',
  projectTypeFilter: 'all',
  ownerFilter: 'all',
  hasUpdateFilter: 'all',
  hasVendorFilter: 'all',
  minAmount: '',
  maxAmount: '',
  searchTerm: '',
}

const projects = [
  {
    id: 1,
    project_name: 'Alpha Training',
    client_name: 'Acme',
    project_type: 'Training',
    status: 'Active',
    inquiry_source: 'Website',
    inquiry_source_remarks: 'Client requested follow-up after webinar',
    award_date: '2026-01-15',
    quote_value: 1000,
    assigned_staff: [
      { staff_id: 10, project_role: 'Leader', name_code: 'AL', full_name: 'Alice Lim' },
    ],
    vendors: [{ vendor_name: 'Vendor One', contact_person_name: 'Nora' }],
    progress_updates: [
      { progress_date: '2026-01-20', progress_text: 'Kickoff done', updated_by: 'AL' },
      { progress_date: '2026-02-01', progress_text: 'Materials ready', updated_by: 'AL' },
    ],
  },
  {
    id: 2,
    project_name: 'Beta Supply',
    client_name: 'Bravo',
    project_type: 'Equipment Supply',
    status: 'Completed',
    inquirySource: 'Referral',
    award_date: '2025-11-10',
    quote_value: 5000,
    assigned_staff: [
      { staff_id: 20, project_role: 'Leader', name_code: 'BY', full_name: 'Ben Yeo' },
    ],
    vendors: [],
    progress_updates: [],
  },
]

describe('projectFilters', () => {
  it('filters by search text across project, staff, vendor, and progress fields', () => {
    expect(
      applyProjectFilters({ projects, filters: { ...defaultFilters, searchTerm: 'materials' } }),
    ).toEqual([projects[0]])

    expect(
      applyProjectFilters({ projects, filters: { ...defaultFilters, searchTerm: 'vendor one' } }),
    ).toEqual([projects[0]])

    expect(
      applyProjectFilters({
        projects,
        filters: { ...defaultFilters, searchTerm: 'webinar' },
      }),
    ).toEqual([projects[0]])
  })

  it('filters by status, type, owner, update presence, vendor presence, amount, and year', () => {
    expect(
      applyProjectFilters({ projects, filters: { ...defaultFilters, statusFilter: 'Completed' } }),
    ).toEqual([projects[1]])
    expect(
      applyProjectFilters({
        projects: [{ ...projects[1], status: ' completed ' }],
        filters: { ...defaultFilters, statusFilter: 'Completed' },
      }),
    ).toEqual([{ ...projects[1], status: ' completed ' }])

    expect(
      applyProjectFilters({
        projects,
        filters: { ...defaultFilters, projectTypeFilter: 'Training' },
      }),
    ).toEqual([projects[0]])

    expect(
      applyProjectFilters({ projects, filters: { ...defaultFilters, ownerFilter: 'BY' } }),
    ).toEqual([projects[1]])

    expect(
      applyProjectFilters({ projects, filters: { ...defaultFilters, hasUpdateFilter: 'no' } }),
    ).toEqual([projects[1]])

    expect(
      applyProjectFilters({ projects, filters: { ...defaultFilters, hasVendorFilter: 'yes' } }),
    ).toEqual([projects[0]])

    expect(
      applyProjectFilters({ projects, filters: { ...defaultFilters, minAmount: '2000' } }),
    ).toEqual([projects[1]])

    expect(
      applyProjectFilters({ projects, filters: { ...defaultFilters, yearFilter: '2026' } }),
    ).toEqual([projects[0]])

    expect(
      applyProjectFilters({
        projects,
        filters: { ...defaultFilters, inquirySourceFilter: 'Referral' },
      }),
    ).toEqual([projects[1]])
  })

  it('filters amounts by current project value when present', () => {
    expect(
      applyProjectFilters({
        projects: [{ ...projects[0], current_project_value: 3000 }, projects[1]],
        filters: { ...defaultFilters, minAmount: '2500', maxAmount: '3500' },
      }),
    ).toEqual([{ ...projects[0], current_project_value: 3000 }])
  })

  it('detects current user ownership by staff id or name code', () => {
    expect(isProjectOwnedByUser(projects[0], { staff_id: 10 })).toBe(true)
    expect(isProjectOwnedByUser(projects[0], { name_code: 'al' })).toBe(true)
    expect(isProjectOwnedByUser(projects[0], { staff_id: 99, name_code: 'zz' })).toBe(false)
  })

  it('builds stable filter option lists and latest update values', () => {
    expect(getProjectTypeOptions(projects)).toEqual(['Equipment Supply', 'Training'])
    expect(getOwnerOptions(projects)).toEqual(['AL', 'BY'])
    expect(getInquirySourceOptions(projects)).toEqual(['Referral', 'Website'])
    expect(getYearOptions(projects, 2026)).toEqual(['2026', '2025'])
    expect(getLatestProgressUpdate(projects[0])).toEqual(
      expect.objectContaining({ progress_text: 'Materials ready' }),
    )
  })
})
