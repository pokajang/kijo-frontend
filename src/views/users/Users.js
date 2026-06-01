import React, { useEffect, useMemo } from 'react'
import { CAlert, CCard, CCardBody, CCol, CRow } from '@coreui/react'
import {
  DataTableCardHeader,
  DataTableRecordList,
  DataTableStatsToggle,
  DataTableStatusBadge,
  DataTableTextCell,
} from '../../components/datatable'
import { StatsStrip } from '../../components/stats'
import { useDataTableStatsVisibility } from '../../hooks/datatable'
import { countByPredicate, formatCount } from '../../utils/stats/formatStats'

const emptyValue = '-'
const columnStorageKey = 'users.system.visible-columns.v3'
const columnPreferenceApiKey = 'users-system-visible-columns-v3'

const defaultVisibleColumns = {
  userId: true,
  fullName: true,
  email: false,
  role: true,
  department: false,
  status: true,
  created: true,
}

const requiredColumns = new Set(['userId', 'fullName', 'status'])

const dataColumns = [
  {
    key: 'userId',
    label: 'User ID',
    width: '100px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    noWrap: true,
  },
  { key: 'fullName', label: 'Full Name', width: '200px', sortable: true, sortType: 'string' },
  { key: 'email', label: 'Email', width: '180px', sortable: true, sortType: 'string' },
  { key: 'role', label: 'Role', width: '140px', sortable: true, sortType: 'string' },
  { key: 'department', label: 'Department', width: '160px', sortable: true, sortType: 'string' },
  {
    key: 'status',
    label: 'Status',
    width: '110px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    noWrap: true,
  },
  {
    key: 'created',
    label: 'Created',
    width: '150px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    noWrap: true,
    getExportValue: (user) => user.createdDisplay,
  },
]

const getStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('inactive') || normalized.includes('disabled')) return 'danger'
  if (normalized.includes('active')) return 'success'
  return 'info'
}

const Users = () => {
  const { statsVisible, toggleStatsVisible } = useDataTableStatsVisibility('users.system')
  const [users, setUsers] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`${import.meta.env.VITE_API_BASE}staff/system-users`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(data?.message || `Request failed with HTTP ${res.status}`)
        }
        return data
      })
      .then((data) => {
        setUsers(
          Array.isArray(data?.users)
            ? data.users
            : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data)
                ? data
                : [],
        )
      })
      .catch((err) => {
        setError(err?.message || 'Unable to load system users.')
        setUsers([])
      })
      .finally(() => setLoading(false))
  }, [])

  const normalizedUsers = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        userId: user.id,
        fullName: user.full_name || emptyValue,
        email: user.email || emptyValue,
        role: user.role || emptyValue,
        department: user.department || emptyValue,
        status: user.status || emptyValue,
        created: user.created_at || '',
        createdDisplay: user.created_at || emptyValue,
      })),
    [users],
  )

  const statsItems = useMemo(() => {
    const activeCount = countByPredicate(normalizedUsers, (user) => {
      const status = String(user.status || '').toLowerCase()
      return status.includes('active') && !status.includes('inactive')
    })
    const inactiveCount = countByPredicate(normalizedUsers, (user) => {
      const status = String(user.status || '').toLowerCase()
      return status.includes('inactive') || status.includes('disabled')
    })

    return [
      {
        key: 'users',
        label: 'Users',
        value: formatCount(normalizedUsers.length),
        tone: 'primary',
      },
      {
        key: 'active',
        label: 'Active',
        value: formatCount(activeCount),
        tone: 'success',
      },
      {
        key: 'inactive',
        label: 'Inactive',
        value: formatCount(inactiveCount),
        tone: inactiveCount ? 'danger' : 'secondary',
      },
      {
        key: 'without-role',
        label: 'Without Role',
        value: formatCount(
          countByPredicate(normalizedUsers, (user) => !user.role || user.role === emptyValue),
        ),
        tone: 'warning',
      },
    ]
  }, [normalizedUsers])

  const renderCell = (user, column) => {
    if (['fullName', 'email', 'role', 'department'].includes(column.key)) {
      return (
        <DataTableTextCell value={user[column.key]} maxWidth={column.width} title={column.label} />
      )
    }

    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={getStatusTone(user.status)}>{user.status}</DataTableStatusBadge>
      )
    }

    if (column.key === 'created') return user.createdDisplay
    return user[column.key] || emptyValue
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <DataTableCardHeader title="System Users">
            <DataTableStatsToggle visible={statsVisible} onToggle={toggleStatsVisible} />
          </DataTableCardHeader>
          <CCardBody>
            {error && <CAlert color="danger">{error}</CAlert>}
            {statsVisible && <StatsStrip items={statsItems} />}
            <DataTableRecordList
              rows={normalizedUsers}
              loading={loading}
              loadingMessage="Loading users..."
              dataColumns={dataColumns}
              defaultVisibleColumns={defaultVisibleColumns}
              requiredColumns={requiredColumns}
              storageKey={columnStorageKey}
              apiKey={columnPreferenceApiKey}
              exportFilename={`system-users-${new Date().toISOString().slice(0, 10)}.csv`}
              emptyMessage="No system users found."
              getRowKey={(user, index) => user.id || index}
              renderCell={renderCell}
              initialSortField="fullName"
              initialSortDirByField={{ userId: 'desc', created: 'desc' }}
              getSortValue={(user, field) => user[field]}
              resetDeps={[users]}
              getMobileTitle={(user) => user.fullName}
              getMobileSubtitle={(user) => user.email}
              getMobileMeta={(user) => `${user.role} | ${user.department}`}
              getMobileStatus={(user) => user.status}
              getMobileStatusTone={(user) => getStatusTone(user.status)}
            />
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Users
