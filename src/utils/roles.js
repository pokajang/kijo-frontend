const splitRoleString = (value) =>
  String(value || '')
    .split(/[,;|/]+/)
    .map((part) => part.trim())
    .filter(Boolean)

export const normalizeRole = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export const extractRolesFromSession = (data) => {
  const candidates = [data?.user?.roles, data?.user?.role, data?.roles, data?.role]

  const raw = []

  for (const candidate of candidates) {
    if (!candidate) continue
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        if (typeof item === 'string' && item.trim() !== '') {
          raw.push(...splitRoleString(item))
        }
      }
      continue
    }
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      raw.push(...splitRoleString(candidate))
    }
  }

  const seen = new Set()
  const deduped = []
  for (const role of raw) {
    const key = normalizeRole(role)
    if (key === '' || seen.has(key)) continue
    seen.add(key)
    deduped.push(role.trim())
  }

  return deduped
}

export const hasAnyAllowedRole = (userRoles = [], allowedRoles = []) => {
  const userSet = new Set((Array.isArray(userRoles) ? userRoles : []).map(normalizeRole))
  return (Array.isArray(allowedRoles) ? allowedRoles : []).some((role) =>
    userSet.has(normalizeRole(role)),
  )
}
