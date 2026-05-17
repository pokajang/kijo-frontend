// src/views/catalog/manage/ManageCatalog.js

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardHeader,
  CCardBody,
  CCol,
  CFormLabel,
  CFormSelect,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
import CatalogTable from './CatalogTable'
import EditCatalogModal from './EditCatalogModal'
import { DataTableRecordControls } from '../../../components/datatable'
import dialog from '../../../components/dialog/dialogService'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { catalogModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import { fetchAllPagedRecords } from '../../../utils/detailPages'

const normalizeText = (value) => String(value || '').toLowerCase()

const ManageCatalog = () => {
  const navigate = useNavigate()
  const currentYear = String(new Date().getFullYear())
  const [catalog, setCatalog] = useState([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => {
    fetchAllPagedRecords({
      url: `${import.meta.env.VITE_API_BASE}catalog/items`,
      params: { year: currentYear },
      dataKeys: ['data'],
      perPage: 100,
    })
      .then((rows) => setCatalog(rows))
      .catch((err) => console.error('Failed to load catalog items', err))
  }, [currentYear])

  const handleView = (item) => {
    navigate(`/catalog/manage/${item.id}`)
  }

  const handleEdit = (item) => {
    setSelectedItem(item)
    setShowEdit(true)
  }

  const handleDelete = async (id) => {
    if (!(await dialog.confirm('Are you sure you want to delete this item?'))) return

    fetch(`${import.meta.env.VITE_API_BASE}catalog/items/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          setCatalog((prev) => prev.filter((item) => item.id !== id))
        } else {
          dialog.alert(data.message || 'Failed to delete item.')
        }
      })
      .catch((err) => {
        console.error('Delete error:', err)
        dialog.alert('Server error occurred.')
      })
  }

  const filterOptions = useMemo(() => {
    const categories = new Set()
    const suppliers = new Set()

    catalog.forEach((item) => {
      if (item.category_id) categories.add(item.category_id)
      if (item.supplier_name) suppliers.add(item.supplier_name)
    })

    return {
      categories: Array.from(categories).sort(),
      suppliers: Array.from(suppliers).sort(),
    }
  }, [catalog])

  const filteredCatalog = useMemo(() => {
    const query = search.trim().toLowerCase()

    return catalog.filter((item) => {
      const matchesSearch =
        !query ||
        [
          item.item_name,
          item.category_id,
          item.supplier_name,
          item.supplier_price,
          item.unit,
          item.price_date,
          item.created_by_code,
          item.description,
          item.remarks,
        ].some((field) => normalizeText(field).includes(query))

      const matchesCategory =
        !categoryFilter || normalizeText(item.category_id) === normalizeText(categoryFilter)
      const matchesSupplier =
        !supplierFilter || normalizeText(item.supplier_name) === normalizeText(supplierFilter)

      return matchesSearch && matchesCategory && matchesSupplier
    })
  }, [catalog, categoryFilter, search, supplierFilter])

  const resetFilters = () => {
    setSearch('')
    setCategoryFilter('')
    setSupplierFilter('')
  }

  const clearChip = (key) => {
    if (key === 'search') setSearch('')
    if (key === 'category') setCategoryFilter('')
    if (key === 'supplier') setSupplierFilter('')
  }

  const activeChips = [
    search.trim() ? { key: 'search', label: `Search: ${search.trim()}` } : null,
    categoryFilter ? { key: 'category', label: `Category: ${categoryFilter}` } : null,
    supplierFilter ? { key: 'supplier', label: `Supplier: ${supplierFilter}` } : null,
  ].filter(Boolean)

  const activeFilterCount = [categoryFilter, supplierFilter].filter(Boolean).length

  return (
    <>
      <ModuleNavStrip tabs={catalogModuleTabs} ariaLabel="Catalog sections" />
      <CCard>
        <CCardHeader>
          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <strong>Manage Catalog</strong>
            <CButton size="sm" color="primary" onClick={() => navigate('/catalog/create')}>
              <CIcon icon={cilPlus} className="me-1" />
              Create Item
            </CButton>
          </div>
        </CCardHeader>
        <CCardBody>
          <CatalogTable
            data={filteredCatalog}
            beforeList={
              <DataTableRecordControls
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search item, category, supplier, price, remarks"
                searchAriaLabel="Search catalog items"
                showAdvancedFilters={showAdvancedFilters}
                setShowAdvancedFilters={setShowAdvancedFilters}
                activeFilterCount={activeFilterCount}
                activeChips={activeChips}
                clearChip={clearChip}
                resetFilters={resetFilters}
                desktopToolsId="catalog-manage-table-tools"
                mobileToolsId="catalog-manage-mobile-table-tools"
              >
                <CCol xs={12} md={6}>
                  <CFormLabel htmlFor="catalogCategoryFilter">Category</CFormLabel>
                  <CFormSelect
                    id="catalogCategoryFilter"
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                  >
                    <option value="">All Categories</option>
                    {filterOptions.categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol xs={12} md={6}>
                  <CFormLabel htmlFor="catalogSupplierFilter">Supplier</CFormLabel>
                  <CFormSelect
                    id="catalogSupplierFilter"
                    value={supplierFilter}
                    onChange={(event) => setSupplierFilter(event.target.value)}
                  >
                    <option value="">All Suppliers</option>
                    {filterOptions.suppliers.map((supplier) => (
                      <option key={supplier} value={supplier}>
                        {supplier}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </DataTableRecordControls>
            }
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            desktopToolsId="catalog-manage-table-tools"
            mobileToolsId="catalog-manage-mobile-table-tools"
          />
        </CCardBody>
      </CCard>

      <EditCatalogModal
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        item={selectedItem}
        onUpdate={(updatedItem) => {
          setCatalog((prev) =>
            prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
          )
          setShowEdit(false)
        }}
      />
    </>
  )
}

export default ManageCatalog
