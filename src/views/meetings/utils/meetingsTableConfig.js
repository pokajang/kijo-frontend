export const dataColumns = [
  {
    key: 'title',
    label: 'Title',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
  {
    key: 'meetingDate',
    label: 'Meeting Date',
    width: '120px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'meetingType',
    label: 'Meeting Type',
    width: '120px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'pendingItems',
    label: 'Pending Items',
    width: '112px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
  },
]

export const defaultVisibleColumns = {
  title: true,
  meetingDate: true,
  meetingType: true,
  pendingItems: true,
}

export const requiredColumns = new Set(['title', 'pendingItems'])
