// src/views/crm/purchase/services.js

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import dialog from '../../../components/dialog/dialogService'
export function useSupplierPoServices() {
  const navigate = useNavigate()

  const [supplierList, setSupplierList] = useState([])
  const [catalogItems, setCatalogItems] = useState([])
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])

  const [quantities, setQuantities] = useState({})
  const [unitPrices, setUnitPrices] = useState({})
  const [discount, setDiscount] = useState(0)
  const [deliveryCharge, setDeliveryCharge] = useState(0)
  const [sstPercent, setSstPercent] = useState(0)

  const [projectList, setProjectList] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)

  // ─── Fetch Supplier List ────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}vendors?status=${encodeURIComponent('active')}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((json) => {
        const vendorRows = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.vendors)
            ? json.vendors
            : []

        if (json?.status === 'success' || json?.success === true || vendorRows.length > 0) {
          setSupplierList(
            vendorRows.map((s) => ({
              label: s.vendor_name,
              value: {
                id: s.vendor_id || s.id,
                company_name: s.vendor_name,
                ssm_number: s.ssm_number,
                sst_number: s.sst_number,
                full_address: `${s.address}, ${s.city}, ${s.state}, ${s.zip}`,
                contact_name: s.contact_person_name,
                contact_number: s.mobile_number,
                email: s.email,
                website: s.website,
              },
            })),
          )
        } else {
          console.error('Failed to load supplier list', json)
        }
      })
      .catch((err) => console.error('Supplier fetch error', err))
  }, [])

  // ─── Fetch Project List ────────────────────────────────────────────────
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const legacyRes = await fetch(`${import.meta.env.VITE_API_BASE}projects`, {
          credentials: 'include',
        })
        if (legacyRes.ok) {
          const projects = await legacyRes.json()
          if (Array.isArray(projects)) {
            setProjectList(
              projects.map((p) => ({
                label: p.project_name,
                value: {
                  project_id: p.id,
                  project_name: p.project_name,
                },
              })),
            )
            return
          }
        }
      } catch (err) {
        // Ignore and try fallback below.
      }

      try {
        // Fallback to Laravel clean endpoint.
        const res = await fetch(`${import.meta.env.VITE_API_BASE}vendor-projects`, {
          credentials: 'include',
        })
        const json = await res.json()
        const rows = Array.isArray(json?.data) ? json.data : []
        setProjectList(
          rows.map((p) => ({
            label: p.project_name,
            value: {
              project_id: p.project_id,
              project_name: p.project_name,
            },
          })),
        )
      } catch (err) {
        console.error('Project list fetch error:', err)
      }
    }

    loadProjects()
  }, [])

  // ─── Fetch Catalog Items ────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}catalog/items`, { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === 'success') {
          setCatalogItems(
            json.data.map((item) => ({
              label: `${item.item_name} — RM ${item.supplier_price}/${item.unit}`,
              value: item,
            })),
          )
        } else {
          console.error('Failed to load catalog items', json)
        }
      })
      .catch((err) => console.error('Catalog fetch error', err))
  }, [])

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleSupplierChange = (option) => {
    setSelectedSupplier(option)
  }

  const handleProjectChange = (option) => {
    setSelectedProject(option)
  }

  const handleItemsChange = (options) => {
    setSelectedItems(options || [])

    // Initialize qty and unit prices
    const qs = {},
      ps = {}
    ;(options || []).forEach(({ value: item }) => {
      qs[item.id] = quantities[item.id] ?? 1
      ps[item.id] = unitPrices[item.id] ?? parseFloat(item.supplier_price)
    })
    setQuantities(qs)
    setUnitPrices(ps)
  }

  const handleQtyChange = (id, v) => {
    const qty = parseInt(v, 10) || 0
    setQuantities((q) => ({ ...q, [id]: qty }))
  }

  const handlePriceChange = (id, v) => {
    const price = parseFloat(v) || 0
    setUnitPrices((p) => ({ ...p, [id]: price }))
  }

  // ─── Computed totals ──────────────────────────────────────────────────────
  const subtotal = Object.entries(quantities).reduce(
    (sum, [id, q]) => sum + q * (unitPrices[id] || 0),
    0,
  )
  const sstAmount = (subtotal + deliveryCharge - discount) * (sstPercent / 100)
  const grandTotal = subtotal + deliveryCharge + sstAmount - discount

  // ─── Reset Handler ────────────────────────────────────────────────────────
  const handleReset = () => {
    setSelectedSupplier(null)
    setSelectedProject(null)
    setSelectedItems([])
    setQuantities({})
    setUnitPrices({})
    setDiscount(0)
    setDeliveryCharge(0)
    setSstPercent(0)
    console.log('Form reset to initial state')
  }

  // ─── Save Handler ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    const payload = {
      project_id: selectedProject?.value?.project_id || null,
      supplier: selectedSupplier?.value || null,
      items: selectedItems.map(({ value: item }) => ({
        item_id: item.id,
        item_name: item.item_name,
        description: item.description || '',
        unit: item.unit || '',
        quantity: quantities[item.id] || 0,
        unit_price: unitPrices[item.id] || 0,
        line_total: (quantities[item.id] || 0) * (unitPrices[item.id] || 0),
      })),
      discount,
      delivery_charge: deliveryCharge,
      sst_percent: sstPercent,
      sst_amount: sstAmount,
      grand_total: grandTotal,
    }

    console.log('Prepared PO payload:', payload)

    const confirmed = await dialog.confirm('Are you sure you want to submit this Purchase Order?')
    if (!confirmed) {
      console.log('PO submission cancelled by user.')
      return
    }

    fetch(`${import.meta.env.VITE_API_BASE}catalog/purchase-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.status === 'success') {
          dialog.alert(`✅ Purchase Order created successfully. PO ID: ${result.po_id || ''}`)
          handleReset()
          navigate('/commercial/supplier-po')
        } else {
          dialog.alert('❌ Failed to create PO: ' + (result.message || 'Unknown error.'))
        }
      })
      .catch((err) => {
        console.error('PO submission error:', err)
        dialog.alert('❌ Network or server error while saving PO.')
      })
  }

  return {
    supplierList,
    selectedSupplier,
    handleSupplierChange,
    projectList,
    selectedProject,
    handleProjectChange,
    catalogItems,
    selectedItems,
    handleItemsChange,
    quantities,
    handleQtyChange,
    unitPrices,
    handlePriceChange,
    discount,
    setDiscount,
    deliveryCharge,
    setDeliveryCharge,
    sstPercent,
    setSstPercent,
    subtotal,
    sstAmount,
    grandTotal,
    handleReset,
    handleSave,
  }
}
