export const scriptsDefaultVisibleColumns = {
  migration: true,
  fileStatus: true,
  databaseStatus: true,
  batch: true,
  drift: true,
}

export const scriptsRequiredColumns = new Set(['migration', 'databaseStatus'])

export const scriptsDataColumns = [
  { key: 'migration', label: 'Migration', width: '320px', sortable: true, sortType: 'string' },
  {
    key: 'fileStatus',
    label: 'Code File',
    width: '120px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    noWrap: true,
    getExportValue: (file) => file.fileStatus,
  },
  {
    key: 'databaseStatus',
    label: 'Database',
    width: '130px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    noWrap: true,
    getExportValue: (file) => file.databaseStatus,
  },
  {
    key: 'batch',
    label: 'Batch',
    width: '100px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    noWrap: true,
  },
  {
    key: 'drift',
    label: 'Drift',
    width: '140px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    noWrap: true,
    getExportValue: (file) => file.drift,
  },
]
