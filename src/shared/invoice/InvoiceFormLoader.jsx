// src/views/project/InvoiceProjectModal/InvoiceFormLoader.jsx
import React from 'react'
import { CAlert } from '@coreui/react'
import TrainingInvoiceForm from './TrainingInvoiceForm'
import EquipmentInvoiceForm from './EquipmentInvoiceForm'
import ManpowerInvoiceForm from './ManpowerInvoiceForm'
import HygieneInvoiceForm from './HygieneInvoiceForm'
import SpecialInvoiceForm from './SpecialInvoiceForm'
// import other form components as needed

const formMap = {
  Training: TrainingInvoiceForm,
  'Equipment Supply': EquipmentInvoiceForm,
  'Manpower Supply': ManpowerInvoiceForm,
  'Industrial Hygiene': HygieneInvoiceForm,
  'Special Service': SpecialInvoiceForm,
  Special: SpecialInvoiceForm,
}

export default function InvoiceFormLoader(props) {
  const { project, mode } = props
  const FormComponent = formMap[project.project_type]

  if (!FormComponent) {
    return (
      <CAlert color="warning" className="m-3 mb-0">
        Unsupported project type: {project.project_type || 'Unknown'}
      </CAlert>
    )
  }

  return <FormComponent {...props} mode={mode} />
}
