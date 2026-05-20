import { describe, expect, it } from 'vitest'

import {
  compareVersions,
  normalizeMetaPayload,
  parsePollMs,
  shouldForceUpdate,
} from './versionCheckUtils'

describe('versionCheckUtils', () => {
  it('uses the default poll interval for invalid values', () => {
    expect(parsePollMs(undefined)).toBe(300000)
    expect(parsePollMs('abc')).toBe(300000)
    expect(parsePollMs(0)).toBe(300000)
  })

  it('compares ISO timestamps correctly', () => {
    expect(compareVersions('2026-05-21T10:00:00.000Z', '2026-05-20T10:00:00.000Z')).toBe(1)
    expect(compareVersions('2026-05-20T10:00:00.000Z', '2026-05-21T10:00:00.000Z')).toBe(-1)
  })

  it('compares semver values correctly', () => {
    expect(compareVersions('1.10.0', '1.2.0')).toBe(1)
    expect(compareVersions('2.0.0', '2.0.1')).toBe(-1)
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
  })

  it('normalizes optional metadata fields', () => {
    expect(
      normalizeMetaPayload({
        version: '2026-05-21T10:00:00.000Z',
        minimum_supported_version: '2026-05-20T10:00:00.000Z',
        force_reload: true,
        message: 'Update required',
      }),
    ).toEqual({
      version: '2026-05-21T10:00:00.000Z',
      minimumSupportedVersion: '2026-05-20T10:00:00.000Z',
      forceReload: true,
      message: 'Update required',
    })
  })

  it('forces update when the current version is below the supported minimum', () => {
    expect(
      shouldForceUpdate({
        currentVersion: '2026-05-20T10:00:00.000Z',
        latestVersion: '2026-05-21T10:00:00.000Z',
        minimumSupportedVersion: '2026-05-21T09:00:00.000Z',
        forceReload: false,
      }),
    ).toBe(true)
  })

  it('forces update even when metadata is changed without a newer remote version', () => {
    expect(
      shouldForceUpdate({
        currentVersion: '2026-05-20T10:00:00.000Z',
        latestVersion: '2026-05-20T10:00:00.000Z',
        minimumSupportedVersion: '2026-05-21T09:00:00.000Z',
        forceReload: false,
      }),
    ).toBe(true)
  })

  it('forces update when the deployment explicitly marks the release as forced', () => {
    expect(
      shouldForceUpdate({
        currentVersion: '2026-05-20T10:00:00.000Z',
        latestVersion: '2026-05-21T10:00:00.000Z',
        minimumSupportedVersion: null,
        forceReload: true,
      }),
    ).toBe(true)
  })
})
