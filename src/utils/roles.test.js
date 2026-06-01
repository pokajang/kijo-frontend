import { describe, expect, it } from 'vitest'
import { hasAnyAllowedRole } from './roles'

describe('role utilities', () => {
  it('lets System Admin pass any explicit role gate', () => {
    expect(hasAnyAllowedRole(['System Admin'], ['HR'])).toBe(true)
    expect(hasAnyAllowedRole(['Staff', 'System Admin'], ['Finance', 'Manager'])).toBe(true)
  })

  it('keeps non-admin role checks scoped to the allowed roles', () => {
    expect(hasAnyAllowedRole(['Staff'], ['HR'])).toBe(false)
    expect(hasAnyAllowedRole(['Finance'], ['HR', 'Finance'])).toBe(true)
  })
})
