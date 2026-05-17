// /vendor/create/CreateVendor.js

import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CRow } from '@coreui/react'

import VendorDetailsForm from './VendorDetailsForm'
import ContactDetailsForm from './ContactDetailsForm'
import VendorTypeForm from './VendorTypeForm'
import BankingDetailsForm from './BankingDetailsForm'
import { checkDuplicateCompany, validateRequiredFields } from './utils/vendorValidation'
import dialog from '../../../components/dialog/dialogService'
// helper to trim spaces and trailing punctuation (commas, slashes, etc.)
const cleanTail = (s) => (s || '').trim().replace(/[\s,;:/\\.!-]+$/g, '')

const CreateVendor = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.returnTo || '/vendor/manage'
  const [vendorList, setVendorList] = useState([])

  const [formData, setFormData] = useState({
    vendorName: '',
    ssmNumber: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'Malaysia',
    intlCountry: '',
    contactPersonName: '',
    email: '',
    companyWebsite: '',
    mobileNumber: '601',
    emergencyContactName: '',
    emergencyRelationship: '',
    emergencyMobileNumber: '',
    sstNo: '',
    status: 'Active',
    bankName: '',
    bankAccountNumber: '',
    bankHolderName: '',

    // Categories & services
    category: [],
    trainingTopics: [],
    supplierProducts: [],
    consultancy: [],
    servicesOffered: [],
    competency: [], // ← added for "Competent Person" block

    // Optional raw multiline notes (kept for UI; send only if you want to store them)
    trainingTopicsText: '',
    supplierProductsText: '',
    consultancyText: '',
    servicesOfferedText: '',
  })

  const [isDuplicate, setIsDuplicate] = useState(false)
  const [duplicateVendorName, setDuplicateVendorName] = useState('')
  const [partialMatchCompany, setPartialMatchCompany] = useState('')

  const fetchAllVendors = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}vendors/main-details`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const result = await response.json()
      const vendorRows = Array.isArray(result?.vendors)
        ? result.vendors
        : Array.isArray(result?.data)
          ? result.data
          : []

      if (result?.status === 'success' || result?.success === true || vendorRows.length > 0) {
        const mapped = vendorRows.map((v) => ({
          name: (v.name || v.vendor_name || '').trim(),
          ssm: v.ssm || v.ssm_number,
          sst: v.sst || v.sst_number,
          mobile: v.mobile_number,
          email: v.email,
          status: v.status,
        }))
        setVendorList(mapped)
      } else {
        console.warn('⚠️ Vendor fetch failed:', result.message)
      }
    } catch (error) {
      console.error('❌ Error fetching vendors:', error)
    }
  }

  useEffect(() => {
    fetchAllVendors()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNameInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    const result = checkDuplicateCompany(value, vendorList)
    setIsDuplicate(result.isDuplicate)
    setDuplicateVendorName(result.exact)
    setPartialMatchCompany(result.partial)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const requiredFields = {
      vendorName: 'Vendor Name',
      mobileNumber: 'Mobile Number',
      bankName: 'Bank Name',
      bankAccountNumber: 'Bank Account Number',
      bankHolderName: 'Bank Holder Name',
    }

    const missingFields = validateRequiredFields(formData, requiredFields)
    if (missingFields.length > 0) {
      dialog.alert(`The following required fields are missing:\n\n${missingFields.join('\n')}`)
      return
    }

    const confirmed = await dialog.confirm('Are you sure you want to create this vendor?')
    if (!confirmed) return

    // Compose state for international without leaking "Other"
    const isInternational = formData.country && formData.country !== 'Malaysia'
    const countryName = (formData.intlCountry || '').trim()
    const composedState = isInternational
      ? [cleanTail(formData.state), countryName].filter(Boolean).join(', ')
      : cleanTail(formData.state)

    // Build payload (send all service buckets including competency)
    const payload = {
      vendorName: cleanTail(formData.vendorName),
      ssmNumber: cleanTail(formData.ssmNumber),
      address: cleanTail(formData.address),
      city: cleanTail(formData.city),
      state: composedState,
      zip: (formData.zip || '').trim(),
      contactPersonName: cleanTail(formData.contactPersonName),
      email: (formData.email || '').trim(),
      companyWebsite: (formData.companyWebsite || '').trim(),
      mobileNumber: (formData.mobileNumber || '').trim(),
      emergencyContactName: cleanTail(formData.emergencyContactName),
      emergencyRelationship: cleanTail(formData.emergencyRelationship),
      emergencyMobileNumber: (formData.emergencyMobileNumber || '').trim(),
      sstNo: (formData.sstNo || '').trim(),
      status: formData.status || 'Active',
      bankName: cleanTail(formData.bankName),
      bankAccountNumber: (formData.bankAccountNumber || '').trim(),
      bankHolderName: cleanTail(formData.bankHolderName),

      // Service categorization (arrays)
      category: formData.category || [],
      trainingTopics: formData.trainingTopics || [],
      supplierProducts: formData.supplierProducts || [],
      consultancy: formData.consultancy || [],
      servicesOffered: formData.servicesOffered || [],
      competency: formData.competency || [],

      // Optional raw notes (uncomment if you want to persist them)
      // trainingTopicsText: formData.trainingTopicsText || '',
      // supplierProductsText: formData.supplierProductsText || '',
      // consultancyText: formData.consultancyText || '',
      // servicesOfferedText: formData.servicesOfferedText || '',

      // NOTE: still do NOT send country / intlCountry
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      })

      const result = await response.json()

      if (result?.status === 'success' || result?.success === true) {
        const createdName = formData.vendorName
        handleReset()
        fetchAllVendors()
        const goToList = await dialog.confirm(
          `Vendor "${createdName}" successfully created. Go to vendor list?`,
          {
            title: 'Vendor Created',
            confirmText: 'Go to list',
            cancelText: 'Create another',
          },
        )
        if (goToList) {
          navigate(returnTo)
        }
      } else {
        console.error(result)
        dialog.alert(`❌ Failed to create vendor: ${result.message}`)
      }
    } catch (err) {
      console.error(err)
      dialog.alert('❌ Error: Unable to connect to the server.')
    }
  }

  const handleReset = () => {
    setFormData({
      vendorName: '',
      ssmNumber: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: 'Malaysia',
      intlCountry: '',
      contactPersonName: '',
      email: '',
      companyWebsite: '',
      mobileNumber: '601',
      emergencyContactName: '',
      emergencyRelationship: '',
      emergencyMobileNumber: '',
      sstNo: '',
      status: 'Active',
      bankName: '',
      bankAccountNumber: '',
      bankHolderName: '',

      category: [],
      trainingTopics: [],
      supplierProducts: [],
      consultancy: [],
      servicesOffered: [],
      competency: [],

      // Optional text fields (kept for UI)
      trainingTopicsText: '',
      supplierProductsText: '',
      consultancyText: '',
      servicesOfferedText: '',
    })
    setIsDuplicate(false)
    setDuplicateVendorName('')
    setPartialMatchCompany('')
  }

  return (
    <CRow>
      <VendorDetailsForm
        {...{
          formData,
          setFormData,
          handleChange,
          handleNameInputChange,
          isDuplicate,
          duplicateVendorName,
          partialMatchCompany,
          onBack: () => navigate(returnTo),
        }}
      />
      <ContactDetailsForm {...{ formData, handleChange }} />
      <VendorTypeForm {...{ formData, setFormData }} />
      <BankingDetailsForm {...{ formData, handleChange, handleSubmit, handleReset }} />
    </CRow>
  )
}

export default CreateVendor
