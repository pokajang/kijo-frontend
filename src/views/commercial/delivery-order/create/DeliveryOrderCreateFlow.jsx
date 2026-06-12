import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, CCard, CCardBody, CCardFooter, CCardHeader } from '@coreui/react'

import DeliveryDetails from './DeliveryOrderDeliveryDetailsStep'
import ProjectDetails from './DeliveryOrderProjectDetailsStep'
import ItemsDetails from './DeliveryOrderItemsDetailsStep'
import dialog from '../../../../components/dialog/dialogService'
import {
  confirmExistingCommercialDocs,
  hasProjectCommercialDocGroups,
  ProjectCommercialDocsNotice,
  useProjectCommercialDocs,
} from '../../../project/manage/commercialDocsWarning'
import {
  buildDeliveryOrderCreatePayload,
  createDeliveryOrder,
  shouldIncludeInvoiceItem,
} from './deliveryOrderCreatePayload'
import DeliveryOrderReviewStep from './DeliveryOrderReviewStep'
import DeliveryOrderSuccessStep from './DeliveryOrderSuccessStep'

const getProjectCode = (project = {}) =>
  project.id
    ? `PRJ${new Date(project.award_date || Date.now()).getFullYear()}-${String(project.id).padStart(
        4,
        '0',
      )}`
    : ''

const DeliveryOrderCreateFlow = ({ project, origin = 'project', onBack }) => {
  const navigate = useNavigate()
  const commercialDocs = useProjectCommercialDocs(project?.id, true)
  const [step, setStep] = useState('edit')
  const [submitting, setSubmitting] = useState(false)
  const [createdResult, setCreatedResult] = useState(null)
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

  useEffect(() => {
    if (!project) return undefined

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
    setCompanyDetails({
      name: 'AMIOSH RESOURCES SDN BHD',
      address: 'No.5-2, Jalan Seri Putra 1/5, Bandar Seri Putra Bangi, 43000 Kajang, Selangor',
      contact: {
        name: project.assigned_staff?.[0]?.full_name || 'Admin',
        email: 'info.admin@amiosh.com',
        phone: '+603-82108726',
      },
    })
    setProjectDetails({
      project_id: project.id,
      name: project.project_name || '',
      code: getProjectCode(project),
      date: project.award_date || '',
      type: project.project_type || '',
      description: project.description || '',
      servicePeriod:
        project.service_start_date && project.service_end_date
          ? `${project.service_start_date} to ${project.service_end_date}`
          : 'Not Available',
    })

    if (project.project_type === 'Equipment Supply' && Array.isArray(project.equipment_items)) {
      setItems(
        project.equipment_items.map((item) => ({
          id: item.id,
          name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
        })),
      )
    } else if (
      project.project_type === 'Industrial Hygiene' &&
      Array.isArray(project.hygiene_items)
    ) {
      setItems(
        project.hygiene_items.map((item) => ({
          id: item.id,
          name: item.item_description,
          description: item.description || '',
          quantity: item.quantity,
          unit: item.unit || 'Lot',
        })),
      )
    } else {
      setItems([])
    }

    if (!['Equipment Supply', 'Industrial Hygiene'].includes(project.project_type) || !project.id) {
      return undefined
    }

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
        const mapped = breakdown.filter(shouldIncludeInvoiceItem).map((item, index) => ({
          id: item.id ?? `inv-${index}`,
          name: item.item_description,
          description: item.description || '',
          quantity: item.quantity,
          unit: item.unit,
        }))
        if (mapped.length > 0) setItems(mapped)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error('Invoice items fetch error:', err)
      })

    return () => controller.abort()
  }, [project])

  const payload = useMemo(
    () =>
      buildDeliveryOrderCreatePayload({
        clientDetails,
        companyDetails,
        projectDetails,
        items,
      }),
    [clientDetails, companyDetails, items, projectDetails],
  )

  const showCommercialDocsNotice =
    commercialDocs.loading ||
    commercialDocs.error ||
    hasProjectCommercialDocGroups(commercialDocs.groups)

  const handleReview = async () => {
    if (items.length === 0) {
      dialog.alert('Please add at least one delivery order item.')
      return
    }
    if (
      !(await confirmExistingCommercialDocs({
        ...commercialDocs,
        recordLabel: 'commercial records',
        createLabel: 'another delivery order',
        title: 'Existing Commercial Records',
      }))
    ) {
      return
    }
    setStep('review')
  }

  const handleCreate = async (forceCreate = false) => {
    if (submitting) return

    setSubmitting(true)
    try {
      const result = await createDeliveryOrder({ ...payload, forceCreate })
      if (result.status === 'exists') {
        const confirmed = await dialog.confirm(
          `A DO already exists (DO: ${result.existing_do_number}). Create another?`,
        )
        if (confirmed) {
          setSubmitting(false)
          return handleCreate(true)
        }
        return
      }
      if (result.status === 'success') {
        if (origin === 'delivery-order-list') {
          setCreatedResult(result)
          setStep('success')
          return
        }
        navigate(`/commercial/delivery-order/${result.do_id}`, {
          state: { fromProjectId: project?.id },
        })
        return
      }
      dialog.alert(result.message || 'Failed to create Delivery Order.')
    } catch (err) {
      console.error('Delivery Order Error:', err)
      dialog.alert('Error occurred while submitting Delivery Order.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
        <strong>Create Delivery Order</strong>
        <CButton
          color="secondary"
          size="sm"
          variant="outline"
          onClick={onBack}
          disabled={submitting}
        >
          Back
        </CButton>
      </CCardHeader>
      {step === 'edit' && (
        <>
          {showCommercialDocsNotice && (
            <CCardBody>
              <ProjectCommercialDocsNotice
                groups={commercialDocs.groups}
                loading={commercialDocs.loading}
                error={commercialDocs.error}
                recordLabel="commercial records"
                createLabel="another delivery order"
              />
            </CCardBody>
          )}
          <DeliveryDetails
            client={clientDetails}
            setClient={setClientDetails}
            company={companyDetails}
            setCompany={setCompanyDetails}
          />
          <ProjectDetails project={projectDetails} setProject={setProjectDetails} />
          <ItemsDetails items={items} setItems={setItems} />
          <CCardFooter className="d-flex justify-content-end gap-2">
            <CButton color="secondary" size="sm" variant="outline" onClick={onBack}>
              Cancel
            </CButton>
            <CButton
              color="primary"
              size="sm"
              disabled={items.length === 0 || commercialDocs.loading}
              onClick={handleReview}
            >
              Review Delivery Order
            </CButton>
          </CCardFooter>
        </>
      )}
      {step === 'review' && (
        <DeliveryOrderReviewStep
          payload={payload}
          submitting={submitting}
          onBack={() => setStep('edit')}
          onCreate={() => handleCreate(false)}
        />
      )}
      {step === 'success' && (
        <DeliveryOrderSuccessStep
          result={createdResult}
          onReturnToList={() => navigate('/commercial/delivery-order')}
          onManageProject={() => navigate(`/project/manage/${project?.id}`)}
          onViewDeliveryOrder={() => navigate(`/commercial/delivery-order/${createdResult?.do_id}`)}
        />
      )}
    </CCard>
  )
}

export default DeliveryOrderCreateFlow
