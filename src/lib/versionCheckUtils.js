export const DEFAULT_POLL_MS = 5 * 60 * 1000

const SEMVER_RE = /^v?\d+(?:\.\d+)*$/

const normalizeSemver = (value) =>
  String(value)
    .replace(/^v/i, '')
    .split('.')
    .map((part) => Number(part))

const compareSemver = (left, right) => {
  const maxLength = Math.max(left.length, right.length)
  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = left[index] ?? 0
    const rightPart = right[index] ?? 0
    if (leftPart > rightPart) return 1
    if (leftPart < rightPart) return -1
  }
  return 0
}

export const parsePollMs = (value) => {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? num : DEFAULT_POLL_MS
}

export const compareVersions = (left, right) => {
  if (!left || !right) return 0

  const leftDate = Date.parse(left)
  const rightDate = Date.parse(right)
  if (Number.isFinite(leftDate) && Number.isFinite(rightDate)) {
    if (leftDate > rightDate) return 1
    if (leftDate < rightDate) return -1
    return 0
  }

  if (SEMVER_RE.test(String(left)) && SEMVER_RE.test(String(right))) {
    return compareSemver(normalizeSemver(left), normalizeSemver(right))
  }

  return String(left).localeCompare(String(right))
}

export const normalizeMetaPayload = (payload) => ({
  version: payload?.version || null,
  minimumSupportedVersion: payload?.minimum_supported_version || null,
  forceReload: payload?.force_reload === true,
  message: payload?.message || null,
})

export const shouldForceUpdate = ({
  currentVersion,
  latestVersion,
  minimumSupportedVersion,
  forceReload,
}) => {
  if (forceReload && latestVersion && latestVersion !== currentVersion) {
    return true
  }

  if (!currentVersion || !minimumSupportedVersion) {
    return false
  }

  return compareVersions(currentVersion, minimumSupportedVersion) < 0
}
