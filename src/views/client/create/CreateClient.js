import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import CompanyDetails from './CompanyDetails'
import PICAndSubmitSection from './PICAndSubmitSection'
import useDuplicateChecker from '../../../hooks/useDuplicateChecker'
import dialog from '../../../components/dialog/dialogService'
import { linkInquiryClient } from '../../marketing/inquiries/inquiryUtils'
import { SYSTEM_DEFAULT_PAYMENT_TERMS_DAYS } from '../../../shared/paymentTerms'
const CreateClient = () => {
  const navigate = useNavigate()
  const [cameFromQuote, setCameFromQuote] = useState(false)
  const [cameFromDebtor, setCameFromDebtor] = useState(false)
  const [cameFromVendorRegistration, setCameFromVendorRegistration] = useState(false)
  const [cameFromInquiryId, setCameFromInquiryId] = useState('')

  useEffect(() => {
    if (sessionStorage.getItem('cameFromQuote') === 'true') {
      setCameFromQuote(true)
    }
    if (sessionStorage.getItem('cameFromDebtor') === 'true') {
      setCameFromDebtor(true)
    }
    if (sessionStorage.getItem('cameFromVendorRegistration') === 'true') {
      setCameFromVendorRegistration(true)
    }
    fetchClientCompanies()
    fetchPICs()
  }, [])

  const initialState = {
    companyName: '',
    ssmNumber: '',
    taxIdNoTin: '',
    clientStatus: 'New',
    useDefaultPaymentTerms: true,
    paymentTermsDays: SYSTEM_DEFAULT_PAYMENT_TERMS_DAYS,
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'Malaysia', // UI-only
    intlCountry: '', // UI-only
  }

  const [clientDetails, setClientDetails] = useState(initialState)
  const [clientDatabase, setClientDatabase] = useState([])
  const [picDatabase, setPicDatabase] = useState([])
  const [picList, setPicList] = useState([])
  const [currentPIC, setCurrentPIC] = useState({
    fullName: '',
    email: '',
    mobileNumber: '601',
    position: '',
  })
  const [branchList, setBranchList] = useState([])
  const [showBranchForm, setShowBranchForm] = useState(false)
  const [currentBranch, setCurrentBranch] = useState({
    branchName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'Malaysia',
    intlCountry: '',
  })

  useEffect(() => {
    let draft = null
    try {
      draft = JSON.parse(sessionStorage.getItem('inquiryCreateClientDraft'))
    } catch {
      sessionStorage.removeItem('inquiryCreateClientDraft')
    }

    if (!draft) return

    setCameFromInquiryId(String(draft.inquiryId || ''))

    setClientDetails((current) => ({
      ...current,
      companyName: draft.companyName || current.companyName,
      ssmNumber: draft.ssmNumber || current.ssmNumber,
      taxIdNoTin: draft.taxIdNoTin || current.taxIdNoTin,
      address: draft.address || current.address,
      city: draft.city || current.city,
      state: draft.state || current.state,
      zip: draft.zip || current.zip,
    }))

    setCurrentPIC((current) => ({
      ...current,
      fullName: draft.contactName || current.fullName,
      email: draft.email || current.email,
      mobileNumber: draft.mobile || current.mobileNumber,
    }))

    sessionStorage.removeItem('inquiryCreateClientDraft')
  }, [])

  const {
    isDuplicate: isDuplicateCompany,
    matchedValue: duplicateCompanyName,
    partialMatch: partialMatchCompany,
  } = useDuplicateChecker({
    valueToCheck: clientDetails.companyName,
    key: 'company_name',
    dataset: clientDatabase,
    matchType: 'partial',
  })

  const {
    isDuplicate: isDuplicatePIC,
    matchedValue: duplicatePICName,
    partialMatch: partialMatchPIC,
  } = useDuplicateChecker({
    valueToCheck: currentPIC.fullName,
    key: 'full_name',
    dataset: picDatabase,
    matchType: 'partial',
  })

  const { isDuplicate: isDuplicateEmail, matchedValue: duplicateEmail } = useDuplicateChecker({
    valueToCheck: currentPIC.email,
    key: 'email',
    dataset: picDatabase,
  })

  const handleInputChange = (e) => {
    const { name, type, checked, value } = e.target
    setClientDetails((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handlePICInputChange = (e) => {
    const { name, value } = e.target
    setCurrentPIC((prev) => ({ ...prev, [name]: value }))
  }

  const handleBranchInputChange = (e) => {
    const { name, value } = e.target
    setCurrentBranch((prev) => ({ ...prev, [name]: value }))
  }

  const addPicToList = () => {
    if (!currentPIC.fullName.trim()) return dialog.alert('Full Name is required')
    if (!currentPIC.email.trim()) return dialog.alert('Email is required')
    setPicList((prev) => [...prev, { ...currentPIC }])
    setCurrentPIC({ fullName: '', email: '', mobileNumber: '601', position: '' })
  }

  const addBranchToList = () => {
    if (!currentBranch.address.trim()) return dialog.alert('Branch address is required')

    setBranchList((prev) => [
      ...prev,
      {
        ...currentBranch,
        branchName: currentBranch.branchName.trim() || `Branch ${prev.length + 1}`,
      },
    ])

    setCurrentBranch({
      branchName: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: 'Malaysia',
      intlCountry: '',
    })
  }

  const fetchClientCompanies = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}client-companies/basic`, {
        credentials: 'include',
      })
      const result = await res.json()
      if (result.status === 'success') setClientDatabase(result.data)
    } catch (err) {
      console.error('Failed to fetch company list:', err)
    }
  }

  const fetchPICs = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}client-pics`, {
        credentials: 'include',
      })
      const result = await res.json()
      if (result.status === 'success') setPicDatabase(result.data)
    } catch (err) {
      console.error('Failed to fetch PIC list:', err)
    }
  }

  const handleSubmit = async () => {
    if (!clientDetails.companyName.trim()) {
      dialog.alert('Company name is required')
      return
    }
    const pendingPicList =
      picList.length > 0
        ? picList
        : cameFromInquiryId && currentPIC.fullName.trim() && currentPIC.email.trim()
          ? [{ ...currentPIC }]
          : []

    if (pendingPicList.length === 0) {
      dialog.alert('Please add at least one PIC')
      return
    }

    // Only send PICs that backend will accept (must have fullName & email)
    const cleanedPicList = pendingPicList
      .map((p) => ({
        fullName: (p.fullName || '').trim(),
        email: (p.email || '').trim(),
        mobileNumber: (p.mobileNumber || '').trim(),
        position: (p.position || '').trim(),
      }))
      .filter((p) => p.fullName && p.email)

    if (cleanedPicList.length === 0) {
      dialog.alert('At least one PIC with both Full Name and Email is required')
      return
    }

    // Compose state for international - never store "Other"
    const isInternational = clientDetails.country && clientDetails.country !== 'Malaysia'
    const countryName = (clientDetails.intlCountry || '').trim()
    const composedState = isInternational
      ? [clientDetails.state, countryName].filter(Boolean).join(', ')
      : clientDetails.state

    const cleanedBranchList = branchList
      .map((branch) => {
        const countryRaw = (branch.country || 'Malaysia').trim()
        const intlCountry = (branch.intlCountry || '').trim()

        return {
          branchName: (branch.branchName || '').trim(),
          address: (branch.address || '').trim(),
          city: (branch.city || '').trim(),
          state: (branch.state || '').trim(),
          zip: (branch.zip || '').trim(),
          country: countryRaw || 'Malaysia',
          intlCountry: countryRaw === 'Other' ? intlCountry : '',
        }
      })
      .filter((branch) => branch.address)

    const payload = {
      companyName: (clientDetails.companyName || '').trim(),
      ssmNumber: (clientDetails.ssmNumber || '').trim(),
      taxIdNoTin: (clientDetails.taxIdNoTin || '').trim(),
      clientStatus: (clientDetails.clientStatus || 'New').trim(),
      useDefaultPaymentTerms: Boolean(clientDetails.useDefaultPaymentTerms),
      paymentTermsDays: clientDetails.useDefaultPaymentTerms
        ? null
        : Number(clientDetails.paymentTermsDays || SYSTEM_DEFAULT_PAYMENT_TERMS_DAYS),
      address: (clientDetails.address || '').trim(),
      city: (clientDetails.city || '').trim(),
      state: (composedState || '').trim(),
      zip: (clientDetails.zip || '').trim(),
      picList: cleanedPicList,
      branchList: cleanedBranchList,
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}client-companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`HTTP ${response.status} ${response.statusText} ${text}`)
      }

      let result
      try {
        result = await response.json()
      } catch {
        const text = await response.text().catch(() => '')
        throw new Error(`Unexpected response: ${text}`)
      }

      if (result.status === 'success') {
        const createdCompanyId = result.company_id || result.data?.company_id
        if (createdCompanyId) {
          sessionStorage.setItem('lastCreatedClientId', String(createdCompanyId))
        }
        sessionStorage.setItem('lastCreatedClientName', clientDetails.companyName)

        if (cameFromInquiryId && createdCompanyId) {
          try {
            await linkInquiryClient(cameFromInquiryId, {
              clientId: createdCompanyId,
              clientName: clientDetails.companyName,
            })
          } catch (err) {
            console.error('Failed to link inquiry to created client:', err)
          }
        }

        setClientDetails(initialState)
        setCurrentPIC({ fullName: '', email: '', mobileNumber: '601', position: '' })
        setPicList([])
        setBranchList([])
        setShowBranchForm(false)
        setCurrentBranch({
          branchName: '',
          address: '',
          city: '',
          state: '',
          zip: '',
          country: 'Malaysia',
          intlCountry: '',
        })
        await fetchClientCompanies()
        await fetchPICs()

        const goToDestination = await dialog.confirm(
          cameFromInquiryId
            ? 'Client created successfully. Return to inquiry?'
            : cameFromDebtor
              ? 'Client created successfully. Return to debtor?'
              : cameFromVendorRegistration
                ? 'Client created successfully. Return to vendor registration?'
                : cameFromQuote
                  ? 'Client created successfully. Return to quotation?'
                  : 'Client created successfully. Go to client list?',
          {
            title: 'Client Created',
            confirmText: cameFromInquiryId
              ? 'Go to inquiry'
              : cameFromDebtor
                ? 'Go to debtor'
                : cameFromVendorRegistration
                  ? 'Go to vendor registration'
                  : cameFromQuote
                    ? 'Go to quotation'
                    : 'Go to list',
            cancelText: 'Create another',
          },
        )

        if (goToDestination) {
          if (cameFromInquiryId) {
            navigate(`/pipeline/inquiries/${cameFromInquiryId}`, {
              state: { inquiryMessage: 'Client created and linked to inquiry.' },
            })
          } else if (cameFromDebtor) {
            sessionStorage.removeItem('cameFromDebtor')
            navigate('/commercial/debtors/create')
          } else if (cameFromVendorRegistration) {
            sessionStorage.removeItem('cameFromVendorRegistration')
            const returnPath =
              sessionStorage.getItem('vendorRegistrationReturnPath') ||
              '/client/vendor-registration/create'
            sessionStorage.removeItem('vendorRegistrationReturnPath')
            navigate(returnPath)
          } else if (cameFromQuote) {
            sessionStorage.removeItem('cameFromQuote')
            navigate('/crm/quotes')
          } else {
            navigate('/client/manage')
          }
        } else {
          navigate('/client/create', { replace: true })
        }
      } else {
        dialog.alert('Failed to create client: ' + (result.message || 'Unknown error.'))
      }
    } catch (error) {
      console.error('API error:', error)
      dialog.alert('Server error. Please try again later.')
    }
  }

  const handleReset = async () => {
    if (await dialog.confirm('Reset the form? This will clear all fields.')) {
      setClientDetails(initialState)
      setCurrentPIC({ fullName: '', email: '', mobileNumber: '601', position: '' })
      setPicList([])
      setBranchList([])
      setShowBranchForm(false)
      setCurrentBranch({
        branchName: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        country: 'Malaysia',
        intlCountry: '',
      })
    }
  }

  const handleBack = () => {
    if (cameFromInquiryId) {
      navigate(`/pipeline/inquiries/${cameFromInquiryId}`)
      return
    }
    if (cameFromQuote) {
      navigate('/crm/quotes')
      return
    }
    if (cameFromDebtor) {
      navigate('/commercial/debtors/create')
      return
    }
    if (cameFromVendorRegistration) {
      const returnPath =
        sessionStorage.getItem('vendorRegistrationReturnPath') ||
        '/client/vendor-registration/create'
      sessionStorage.removeItem('vendorRegistrationReturnPath')
      navigate(returnPath)
      return
    }
    navigate('/client/manage')
  }

  return (
    <>
      <CompanyDetails
        clientDetails={clientDetails}
        handleInputChange={handleInputChange}
        isDuplicateCompany={isDuplicateCompany}
        duplicateCompanyName={duplicateCompanyName}
        partialMatchCompany={partialMatchCompany}
        branchList={branchList}
        setBranchList={setBranchList}
        showBranchForm={showBranchForm}
        setShowBranchForm={setShowBranchForm}
        currentBranch={currentBranch}
        handleBranchInputChange={handleBranchInputChange}
        addBranchToList={addBranchToList}
        onBack={handleBack}
      >
        <PICAndSubmitSection
          embedded
          picList={picList}
          setPicList={setPicList}
          currentPIC={currentPIC}
          handlePICInputChange={handlePICInputChange}
          addPicToList={addPicToList}
          isDuplicatePIC={isDuplicatePIC}
          duplicatePICName={duplicatePICName}
          partialMatchPIC={partialMatchPIC}
          isDuplicateEmail={isDuplicateEmail}
          duplicateEmail={duplicateEmail}
          handleSubmit={handleSubmit}
          handleReset={handleReset}
        />
      </CompanyDetails>
    </>
  )
}

export default CreateClient
