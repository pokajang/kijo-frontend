import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CButton, CCol } from '@coreui/react'
import { DataTableDetailShell } from '../../../components/datatable'
import { DetailField, DetailSection } from '../../commercial/shared/CommercialDetailFields'
import EditCatalogModal from './EditCatalogModal'
import dialog from '../../../components/dialog/dialogService'
import { resolveAssetUrl } from '../../../utils/assetUrls'

const API_BASE = import.meta.env.VITE_API_BASE
const emptyValue = '-'

const money = (value) => {
  const parsed = Number.parseFloat(value)
  return `RM ${Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00'}`
}

const DetailLongField = ({ label, value }) => (
  <CCol xs={12}>
    <div className="records-detail-field">
      <div className="small text-muted">{label}</div>
      <div>{value || emptyValue}</div>
    </div>
  </CCol>
)

const CatalogDetailPage = () => {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editVisible, setEditVisible] = useState(false)

  const loadItem = useCallback(async () => {
    const id = Number(itemId)
    if (!id) {
      setItem(null)
      setError('Invalid catalog item ID.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE}catalog/items/${id}`, {
        credentials: 'include',
      })
      const result = await response.json()

      if (result.status !== 'success' || !result.data) {
        throw new Error(result.message || 'Unable to load catalog item.')
      }

      setItem(result.data)
    } catch (err) {
      console.error('Catalog item detail fetch error:', err)
      setItem(null)
      setError(err.message || 'Unable to load catalog item.')
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => {
    loadItem()
  }, [loadItem])

  const handleDelete = async () => {
    if (!item) return
    const confirmed = await dialog.confirm(`Are you sure you want to delete ${item.item_name}?`)
    if (!confirmed) return

    try {
      const response = await fetch(`${API_BASE}catalog/items/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const result = await response.json()
      if (result.status === 'success') {
        dialog.alert('Catalog item deleted successfully.')
        navigate('/catalog/manage')
      } else {
        dialog.alert(result.message || 'Failed to delete item.')
      }
    } catch (err) {
      console.error('Delete catalog item error:', err)
      dialog.alert('Server error occurred.')
    }
  }

  const handleUpdate = (updatedItem) => {
    setItem(updatedItem || item)
    setEditVisible(false)
  }

  const brochureUrl = item?.brochure_url ? resolveAssetUrl(item.brochure_url) : null
  const priceDisplay = `${money(item?.supplier_price)}/${item?.unit || emptyValue}`

  return (
    <>
      <DataTableDetailShell
        title="Catalog Item Details"
        backLabel="Back"
        onBack={() => navigate('/catalog/manage')}
        loading={loading}
        error={error}
        record={item}
        emptyMessage="Catalog item not found."
        actions={[
          { key: 'edit', label: 'Edit', onClick: () => setEditVisible(true) },
          {
            key: 'delete',
            label: 'Delete',
            danger: true,
            dividerBefore: true,
            onClick: handleDelete,
          },
        ]}
      >
        <DetailSection title="Item Details">
          <DetailField label="Item Name" value={item?.item_name} />
          <DetailField label="Category" value={item?.category_id} />
          <DetailField label="Supplier Name" value={item?.supplier_name} />
          <DetailField label="Supplier Price" value={priceDisplay} />
          <DetailField label="Price Date" value={item?.price_date} />
          <DetailField label="Created By" value={item?.created_by_code} />
          <DetailLongField label="Description" value={item?.description} />
          <DetailLongField label="Entry Remarks" value={item?.remarks} />
        </DetailSection>

        <DetailSection title="Product Brochure">
          <CCol xs={12}>
            {brochureUrl ? (
              <div className="records-detail-field">
                <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-2">
                  <span>{item?.brochure_filename || 'Attached brochure'}</span>
                  <CButton
                    size="sm"
                    color="secondary"
                    variant="outline"
                    onClick={() => window.open(brochureUrl, '_blank', 'noopener,noreferrer')}
                  >
                    Open
                  </CButton>
                </div>
                <iframe
                  src={brochureUrl}
                  title="Product brochure"
                  width="100%"
                  height="420"
                  style={{
                    border: '1px solid var(--app-border-card)',
                    borderRadius: 'var(--app-radius-lg)',
                  }}
                />
              </div>
            ) : (
              <div className="text-muted">No brochure attached.</div>
            )}
          </CCol>
        </DetailSection>
      </DataTableDetailShell>

      <EditCatalogModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        item={item}
        onUpdate={handleUpdate}
      />
    </>
  )
}

export default CatalogDetailPage
