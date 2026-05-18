// src/views/project/DeliveryOrderModal/index.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CCard,
  CButton,
} from '@coreui/react'

import DeliveryDetails from './DeliveryDetails'
import ProjectDetails from './ProjectDetails'
import ItemsDetails from './ItemsDetails'
import dialog from '../../../../components/dialog/dialogService'
import {
  confirmExistingCommercialDocs,
  ProjectCommercialDocsNotice,
  useProjectCommercialDocs,
} from '../commercialDocsWarning'
export default function DeliveryOrderModal({ visible, onClose, project }) {
  const navigate = useNavigate()
  const commercialDocs = useProjectCommercialDocs(project?.id, visible, 'delivery-orders')

  // 1) State for each section
  const [clientDetails, setClientDetails] = useState({
    name: '',
    address: '',
    contact: { name: '', position: '', email: '', phone: '' },
  })
  const [companyDetails, setCompanyDetails] = useState({
    name: '',
    address: '',
    contact: { name: '', email: '', phone: '' },
  })
  const [projectDetails, setProjectDetails] = useState({
    project_id: null,
    name: '',
    code: '',
    date: '',
    type: '',
    description: '',
    servicePeriod: '',
  })
  const [items, setItems] = useState([])

  const shouldIncludeInvoiceItem = (item) => {
    const label = String(item?.item_description || '')
      .trim()
      .toLowerCase()
    if (!label) return false
    const excluded = ['discount', 'delivery charge', 'misc charge', 'sst', 'hrd']
    return !excluded.some((keyword) => label.includes(keyword))
  }

  // 2) Initialize from fetched `project` whenever it changes
  useEffect(() => {
    if (!project) return

    // Client
    setClientDetails({
      name: project.client_name || '',
      address: project.client_full_address || '',
      contact: project.client_pics?.[0]
        ? {
            name: project.client_pics[0].full_name,
            position: project.client_pics[0].position || '',
            email: project.client_pics[0].email,
            phone: project.client_pics[0].mobile_number,
          }
        : { name: '', position: '', email: '', phone: '' },
    })

    // Company
    setCompanyDetails({
      name: 'AMIOSH RESOURCES SDN BHD',
      address: 'No.5-2, Jalan Seri Putra 1/5, Bandar Seri Putra Bangi, 43000 Kajang, Selangor',
      contact: {
        name: project.assigned_staff?.[0]?.full_name || 'Admin',
        email: 'info.admin@amiosh.com',
        phone: '+603-82108726',
      },
    })

    // Project
    setProjectDetails({
      project_id: project.id,
      name: project.project_name || '',
      code: project.id
        ? `PRJ${new Date(project.award_date || Date.now()).getFullYear()}-${String(
            project.id,
          ).padStart(4, '0')}`
        : '',
      date: project.award_date || '',
      type: project.project_type || '',
      description: project.description || '',
      servicePeriod:
        project.service_start_date && project.service_end_date
          ? `${project.service_start_date} to ${project.service_end_date}`
          : 'Not Available',
    })

    // Items (preload for Equipment Supply)
    if (project.project_type === 'Equipment Supply' && Array.isArray(project.equipment_items)) {
      setItems(
        project.equipment_items.map((ei) => ({
          id: ei.id,
          name: ei.item_name,
          description: ei.description,
          quantity: ei.quantity,
          unit: ei.unit,
        })),
      )
    } else {
      setItems([])
    }

    if (project.project_type !== 'Equipment Supply' || !project.id) return

    const controller = new AbortController()
    const params = new URLSearchParams({
      project_id: String(project.id),
      service_type: project.project_type,
    })

    fetch(`${import.meta.env.VITE_API_BASE}invoices/latest-by-project?${params.toString()}`, {
      signal: controller.signal,
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((result) => {
        if (result?.status !== 'success') return
        const breakdown = result?.data?.breakdown
        if (!Array.isArray(breakdown) || breakdown.length === 0) return
        const mapped = breakdown.filter(shouldIncludeInvoiceItem).map((item, idx) => ({
          id: item.id ?? `inv-${idx}`,
          name: item.item_description,
          description: item.description || '',
          quantity: item.quantity,
          unit: item.unit,
        }))
        if (mapped.length > 0) setItems(mapped)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Invoice items fetch error:', err)
        }
      })

    return () => controller.abort()
  }, [project])

  // 3) Build payload
  const prepareDeliveryOrderData = (forceCreate = false) => {
    const mappedItems = items.map((item) => ({
      item_name: item.name,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
    }))

    return {
      details: {
        client_name: clientDetails.name,
        client_address: clientDetails.address,
        client_contact_name: clientDetails.contact.name,
        client_contact_position: clientDetails.contact.position,
        client_contact_email: clientDetails.contact.email,
        client_contact_phone: clientDetails.contact.phone,
        company_contact_name: companyDetails.contact.name,
        company_contact_email: companyDetails.contact.email,
        company_contact_phone: companyDetails.contact.phone,
        project_id: projectDetails.project_id,
        project_name: projectDetails.name,
        project_code: projectDetails.code,
        project_award_date: projectDetails.date,
        project_type: projectDetails.type,
        project_description: projectDetails.description,
        project_service_period: projectDetails.servicePeriod,
      },
      items: mappedItems,
      breakdown: mappedItems,
      forceCreate,
    }
  }

  // 4) Submit handler (unchanged)
  const handleGenerateDO = async (forceCreate = false, skipExistingDocsConfirm = false) => {
    if (
      !skipExistingDocsConfirm &&
      !(await confirmExistingCommercialDocs({
        ...commercialDocs,
        recordLabel: 'delivery orders',
        createLabel: 'another delivery order',
        title: 'Existing Delivery Orders',
      }))
    ) {
      return
    }

    const hasExistingDo = commercialDocs.groups.some(
      (group) =>
        group.key === 'delivery-orders' && Array.isArray(group.items) && group.items.length,
    )
    if (!forceCreate && hasExistingDo) {
      return handleGenerateDO(true, true)
    }

    const payload = prepareDeliveryOrderData(forceCreate)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}delivery-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (result.status === 'exists') {
        const confirm = await dialog.confirm(
          `A DO already exists (DO: ${result.existing_do_number}). Create another?`,
        )
        if (confirm) return handleGenerateDO(true, true)
      } else if (result.status === 'success') {
        const goToList = await dialog.confirm(`DO ${result.do_number} created. Go to list?`, {
          title: 'Delivery Order Created',
          confirmText: 'Go to list',
          cancelText: 'Stay here',
        })
        if (goToList) {
          navigate('/commercial/delivery-order')
        } else {
          onClose?.()
        }
      } else {
        dialog.alert(result.message || '❌ Failed to create Delivery Order.')
      }
    } catch (err) {
      console.error('Delivery Order Error:', err)
      dialog.alert('❌ Error occurred while submitting Delivery Order.')
    }
  }

  // 5) Render
  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      size="xl"
      backdrop="static"
      scrollable
    >
      <CModalHeader>
        <CModalTitle>Generate Delivery Order</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <ProjectCommercialDocsNotice
          groups={commercialDocs.groups}
          loading={commercialDocs.loading}
          error={commercialDocs.error}
          recordLabel="delivery orders"
          createLabel="another delivery order"
        />
        <CCard>
          <DeliveryDetails
            client={clientDetails}
            setClient={setClientDetails}
            company={companyDetails}
            setCompany={setCompanyDetails}
          />
          <ProjectDetails project={projectDetails} setProject={setProjectDetails} />
          <ItemsDetails items={items} setItems={setItems} />
        </CCard>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" size="sm" onClick={onClose}>
          Cancel
        </CButton>
        <CButton
          color="primary"
          size="sm"
          disabled={items.length === 0 || commercialDocs.loading}
          onClick={() => handleGenerateDO(false)}
        >
          Generate DO
        </CButton>
      </CModalFooter>
    </CModal>
  )
}
