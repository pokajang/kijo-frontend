export const formatDateTime = (value) => {
  if (!value) return '-'

  const normalized = String(value).replace(' ', 'T')
  const dt = new Date(normalized)
  return Number.isNaN(dt.getTime()) ? value : dt.toLocaleString()
}

export const getStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (
    normalized === 'success' ||
    normalized === 'synced' ||
    normalized === 'applied' ||
    normalized === 'present' ||
    normalized === 'archived' ||
    normalized === 'none' ||
    normalized === 'no changes'
  ) {
    return 'success'
  }
  if (normalized === 'failed' || normalized === 'needs sync' || normalized === 'missing file') {
    return 'danger'
  }
  if (normalized === 'changed' || normalized === 'pending' || normalized === 'not applied') {
    return 'warning'
  }
  return 'info'
}

export const normalizeScripts = (files) =>
  files.map((file) => {
    const filePresent = Boolean(file.file_present ?? true)
    const archived = Boolean(file.archived)
    const applied = Boolean(file.applied ?? file.synced)
    const fileStatus = archived ? 'Archived' : filePresent ? 'Present' : 'Missing File'
    const databaseStatus = applied ? 'Applied' : 'Pending'
    const drift =
      archived || (filePresent && applied)
        ? 'None'
        : !filePresent && applied
          ? 'Missing File'
          : filePresent && !applied
            ? 'Not Applied'
            : 'None'

    return {
      ...file,
      migration: file.name || '-',
      statusRank: !archived && !filePresent && applied ? 0 : filePresent && !applied ? 1 : 2,
      fileStatus,
      fileStatusTone: getStatusTone(fileStatus),
      databaseStatus,
      databaseStatusTone: getStatusTone(databaseStatus),
      batch: file.batch ?? '-',
      drift,
      driftTone: getStatusTone(drift),
    }
  })
