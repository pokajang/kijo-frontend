import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dialog from '../../../components/dialog/dialogService'
import { formatMoney } from '../../../utils/formatters/numberFormatters'

const getProjectId = (project = {}) => project.id ?? project.project_id
const getOptionProjectId = (option = {}) => getProjectId(option.value || {})

const getProjectName = (project = {}) =>
  project.project_name || project.projectName || project.name || ''

const toProjectOption = (project = {}) => {
  const projectId = getProjectId(project)
  if (!projectId) return null

  return {
    label: getProjectName(project) || `Project #${projectId}`,
    value: {
      ...project,
      project_id: project.project_id ?? projectId,
      project_name: getProjectName(project) || `Project #${projectId}`,
    },
  }
}

export const mergeProjectOption = (options, option) => {
  if (!option?.value?.project_id) return options
  const exists = options.some(
    (item) => String(item?.value?.project_id) === String(option.value.project_id),
  )
  return exists ? options : [option, ...options]
}

export const resolveHydratedProjectOption = (options, initialOption) => {
  const initialId = getOptionProjectId(initialOption)
  if (!initialId) return initialOption || null

  return (
    options.find((option) => String(getOptionProjectId(option)) === String(initialId)) ||
    initialOption
  )
}

export const findEquipmentSnapshotItem = (project = {}, item = {}) => {
  if (!Array.isArray(project.equipment_items)) return null

  return (
    project.equipment_items.find(
      (quotedItem) =>
        String(quotedItem.item_id ?? quotedItem.catalog_item_id ?? quotedItem.id) ===
        String(item.id ?? item.item_id ?? item.catalog_item_id),
    ) || null
  )
}

export const buildSupplierPoQuotationRemarks = (project = {}, quotationRemarks = '') => {
  if (
    project.project_type !== 'Equipment Supply' ||
    !Object.prototype.hasOwnProperty.call(project, 'quotation_remarks')
  ) {
    return {}
  }

  return { quotation_remarks: quotationRemarks }
}

export const buildSupplierPoItemPayload = ({ item, snapshotItem, quantity, unitPrice }) => {
  const payload = {
    item_id: item.id,
    item_name: snapshotItem?.item_name || item.item_name,
    description: snapshotItem?.description ?? item.description ?? '',
    unit: snapshotItem?.unit || item.unit || '',
    quantity,
    unit_price: unitPrice,
    line_total: quantity * unitPrice,
  }
  if (snapshotItem || Object.prototype.hasOwnProperty.call(item, 'item_remarks')) {
    payload.item_remarks = snapshotItem?.item_remarks ?? item.item_remarks ?? ''
  }

  return payload
}

export function useSupplierPoServices({
  initialProjectId,
  initialProject,
  lockProject = false,
  onCreated,
} = {}) {
  const navigate = useNavigate()
  const initialProjectOption = useMemo(() => {
    if (!initialProjectId && !initialProject) return null
    return toProjectOption({
      ...initialProject,
      id: initialProjectId ?? initialProject?.id,
      project_id: initialProject?.project_id ?? initialProjectId ?? initialProject?.id,
    })
  }, [initialProject, initialProjectId])

  const [supplierList, setSupplierList] = useState([])
  const [catalogItems, setCatalogItems] = useState([])
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])

  const [quantities, setQuantities] = useState({})
  const [unitPrices, setUnitPrices] = useState({})
  const [discount, setDiscount] = useState(0)
  const [deliveryCharge, setDeliveryCharge] = useState(0)
  const [sstPercent, setSstPercent] = useState(0)
  const [quotationRemarks, setQuotationRemarks] = useState(
    initialProjectOption?.value?.quotation_remarks || '',
  )
  const [submitting, setSubmitting] = useState(false)

  const [projectList, setProjectList] = useState(() =>
    initialProjectOption ? [initialProjectOption] : [],
  )
  const [selectedProject, setSelectedProject] = useState(initialProjectOption)

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
            vendorRows.map((supplier) => ({
              label: supplier.vendor_name,
              value: {
                id: supplier.vendor_id || supplier.id,
                company_name: supplier.vendor_name,
                ssm_number: supplier.ssm_number,
                sst_number: supplier.sst_number,
                full_address: [supplier.address, supplier.city, supplier.state, supplier.zip]
                  .filter(Boolean)
                  .join(', '),
                contact_name: supplier.contact_person_name,
                contact_number: supplier.mobile_number,
                email: supplier.email,
                website: supplier.website,
              },
            })),
          )
        } else {
          console.error('Failed to load supplier list', json)
        }
      })
      .catch((err) => console.error('Supplier fetch error', err))
  }, [])

  useEffect(() => {
    const applyProjectOptions = (options) => {
      const hydratedInitial = resolveHydratedProjectOption(options, initialProjectOption)
      setProjectList(mergeProjectOption(options, hydratedInitial))
      if (!hydratedInitial) return

      setSelectedProject((current) => {
        if (!current) return hydratedInitial
        return String(getOptionProjectId(current)) === String(getOptionProjectId(hydratedInitial))
          ? hydratedInitial
          : current
      })
    }

    const loadProjects = async () => {
      try {
        const legacyRes = await fetch(`${import.meta.env.VITE_API_BASE}projects`, {
          credentials: 'include',
        })
        if (legacyRes.ok) {
          const projects = await legacyRes.json()
          if (Array.isArray(projects)) {
            const options = projects
              .map((project) =>
                toProjectOption({ ...project, project_id: project.project_id ?? project.id }),
              )
              .filter(Boolean)
            applyProjectOptions(options)
            return
          }
        }
      } catch (err) {
        // Ignore and try fallback below.
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}vendor-projects`, {
          credentials: 'include',
        })
        const json = await res.json()
        const rows = Array.isArray(json?.data) ? json.data : []
        const options = rows.map((project) => toProjectOption(project)).filter(Boolean)
        applyProjectOptions(options)
      } catch (err) {
        console.error('Project list fetch error:', err)
      }
    }

    loadProjects()
  }, [initialProjectOption])

  useEffect(() => {
    if (!initialProjectOption?.value?.project_id) return
    setProjectList((current) => mergeProjectOption(current, initialProjectOption))
    setSelectedProject((current) => current || initialProjectOption)
  }, [initialProjectOption])

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}catalog/items`, { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === 'success') {
          setCatalogItems(
            json.data.map((item) => ({
              label: `${item.item_name} - ${formatMoney(item.supplier_price)}/${item.unit}`,
              value: item,
            })),
          )
        } else {
          console.error('Failed to load catalog items', json)
        }
      })
      .catch((err) => console.error('Catalog fetch error', err))
  }, [])

  const handleSupplierChange = (option) => {
    setSelectedSupplier(option)
  }

  const handleProjectChange = (option) => {
    if (lockProject) return
    setSelectedProject(option)
  }

  useEffect(() => {
    setQuotationRemarks(selectedProject?.value?.quotation_remarks || '')
  }, [selectedProject])

  const equipmentSnapshotItem = (item = {}) => {
    return findEquipmentSnapshotItem(selectedProject?.value, item)
  }

  const handleItemsChange = (options) => {
    setSelectedItems(options || [])

    const nextQuantities = {}
    const nextUnitPrices = {}
    ;(options || []).forEach(({ value: item }) => {
      nextQuantities[item.id] = quantities[item.id] ?? 1
      nextUnitPrices[item.id] = unitPrices[item.id] ?? Number.parseFloat(item.supplier_price)
    })
    setQuantities(nextQuantities)
    setUnitPrices(nextUnitPrices)
  }

  const handleQtyChange = (id, value) => {
    const qty = Number.parseInt(value, 10) || 0
    setQuantities((current) => ({ ...current, [id]: qty }))
  }

  const handlePriceChange = (id, value) => {
    const price = Number.parseFloat(value) || 0
    setUnitPrices((current) => ({ ...current, [id]: price }))
  }

  const subtotal = Object.entries(quantities).reduce(
    (sum, [id, qty]) => sum + qty * (unitPrices[id] || 0),
    0,
  )
  const sstAmount = (subtotal + deliveryCharge - discount) * (sstPercent / 100)
  const grandTotal = subtotal + deliveryCharge + sstAmount - discount

  const handleReset = () => {
    setSelectedSupplier(null)
    setSelectedProject(lockProject ? initialProjectOption : null)
    setSelectedItems([])
    setQuantities({})
    setUnitPrices({})
    setDiscount(0)
    setDeliveryCharge(0)
    setSstPercent(0)
    setQuotationRemarks(lockProject ? initialProjectOption?.value?.quotation_remarks || '' : '')
  }

  const handleSave = async () => {
    if (submitting) return
    if (lockProject && !selectedProject?.value?.project_id) {
      dialog.alert('A project is required to create this Supplier PO.')
      return
    }

    const payload = {
      project_id: selectedProject?.value?.project_id || null,
      ...buildSupplierPoQuotationRemarks(selectedProject?.value, quotationRemarks),
      supplier: selectedSupplier?.value || null,
      items: selectedItems.map(({ value: item }) => {
        const snapshotItem = equipmentSnapshotItem(item)
        return buildSupplierPoItemPayload({
          item,
          snapshotItem,
          quantity: quantities[item.id] || 0,
          unitPrice: unitPrices[item.id] || 0,
        })
      }),
      discount,
      delivery_charge: deliveryCharge,
      sst_percent: sstPercent,
      sst_amount: sstAmount,
      grand_total: grandTotal,
    }

    const confirmed = await dialog.confirm('Are you sure you want to submit this Purchase Order?')
    if (!confirmed) return

    setSubmitting(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}catalog/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const result = await response.json()

      if (!response.ok || result.status !== 'success') {
        await dialog.alert('Failed to create PO: ' + (result.message || 'Unknown error.'))
        return
      }

      const poId = result.po_id || result?.data?.po_id || result?.data?.id || result?.id || ''
      handleReset()
      if (typeof onCreated === 'function') {
        try {
          await onCreated({ poId, result, payload })
        } catch (error) {
          console.error('Supplier PO post-create action error:', error)
          await dialog.alert(
            'The Purchase Order was created, but the next actions could not be shown. Open it from the Supplier PO list.',
          )
        }
      } else {
        await dialog.alert(`Purchase Order created successfully. PO ID: ${poId}`)
        navigate('/commercial/supplier-po')
      }
    } catch (err) {
      console.error('PO submission error:', err)
      await dialog.alert('Network or server error while saving PO.')
    } finally {
      setSubmitting(false)
    }
  }

  return {
    supplierList,
    selectedSupplier,
    handleSupplierChange,
    projectList,
    selectedProject,
    handleProjectChange,
    lockProject,
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
    quotationRemarks,
    setQuotationRemarks,
    equipmentSnapshotItem,
    subtotal,
    sstAmount,
    grandTotal,
    handleReset,
    handleSave,
    submitting,
  }
}
