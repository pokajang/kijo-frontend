import { describe, expect, it } from 'vitest'
import {
  buildVendorRegistrationDetailPath,
  buildVendorRegistrationEditPath,
  buildVendorRegistrationFormData,
  getVendorRegistrationEditActionLabel,
  normalizeVendorRegistrationRows,
} from '../vendorRegistrationUtils'

describe('ClientVendorRegistrationPage helpers', () => {
  it('maps API rows into table display rows', () => {
    const [row] = normalizeVendorRegistrationRows([
      {
        id: 7,
        client_id: 3,
        client_name: 'Alpha Client',
        valid_from: '2026-01-01',
        valid_until: '2026-12-31',
        days_left: 120,
        status: 'active',
        has_certificate: true,
        certificate_original_name: 'cert.pdf',
        certificate_url: '/client-vendor-registrations/7/certificate',
        portal_url: 'https://portal.example.test',
        portal_username: 'alpha-user',
        portal_password: 'alpha-pass',
        recipients: [{ staff_id: 10, full_name: 'Aminah', email: 'a@example.com' }],
        recipient_staff_ids: [10],
        updated_at: '2026-05-19 10:30:00',
      },
    ])

    expect(row).toEqual(
      expect.objectContaining({
        client: 'Alpha Client',
        validFrom: '2026-01-01',
        validUntil: '2026-12-31',
        daysLeft: 120,
        statusLabel: 'Active',
        recipientsText: 'Aminah',
        certificate: 'cert.pdf',
        portalUrl: 'https://portal.example.test',
        portalUsername: 'alpha-user',
        portalPassword: 'alpha-pass',
        updatedAt: '2026-05-19',
      }),
    )
  })

  it('builds multipart form data for create and update', () => {
    const formData = buildVendorRegistrationFormData({
      selectedClient: { company_id: 12 },
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      recipientStaffIds: [4, 5],
      portalUrl: 'https://portal.example.test',
      portalUsername: 'alpha-user',
      portalPassword: 'alpha-pass',
      remarks: 'Renewal pending',
      certificate: null,
    })

    expect(formData.get('client_id')).toBe('12')
    expect(formData.get('valid_from')).toBe('2026-01-01')
    expect(formData.get('valid_until')).toBe('2026-12-31')
    expect(formData.get('portal_url')).toBe('https://portal.example.test')
    expect(formData.get('portal_username')).toBe('alpha-user')
    expect(formData.get('portal_password')).toBe('alpha-pass')
    expect(formData.getAll('recipient_staff_ids[]')).toEqual(['4', '5'])
    expect(formData.get('remarks')).toBe('Renewal pending')
  })

  it('builds separate detail and edit routes', () => {
    expect(buildVendorRegistrationDetailPath(12)).toBe('/client/vendor-registration/12')
    expect(buildVendorRegistrationEditPath(12)).toBe('/client/vendor-registration/12/edit')
  })

  it('labels expired edit actions as renewal actions', () => {
    expect(getVendorRegistrationEditActionLabel('expired')).toBe('Renew Registration')
    expect(getVendorRegistrationEditActionLabel('active')).toBe('Edit')
  })
})
