import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Select from '../../../components/forms/ThemedSelect'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormLabel,
  CRow,
  CButton,
  CFormCheck,
} from '@coreui/react'
import { contactKey, getSelectedContacts } from './quoteContactUtils'
import { fetchAllPagedRecords } from '../../../utils/detailPages'
import { quoteApiUrl } from './quoteApi'
import {
  clearPendingCreatedClient,
  hasPendingCreatedClient,
  markCameFromQuote,
  readPendingCreatedClient,
} from './quoteClientHandoff'

const SelectClientCard = ({
  selectedClient,
  onClientChange,
  title = 'Select Client',
  onBack,
  onCreateClient,
  shell = 'card',
}) => {
  const navigate = useNavigate()
  const selectedClientRef = useRef(selectedClient)
  const onClientChangeRef = useRef(onClientChange)
  const [clientOptions, setClientOptions] = useState([])
  const [hasTyped, setHasTyped] = useState(false)
  const [selectedPicKeys, setSelectedPicKeys] = useState([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [autoSelectingCreatedClient, setAutoSelectingCreatedClient] =
    useState(hasPendingCreatedClient)
  const [loadingBranches, setLoadingBranches] = useState(false)

  useEffect(() => {
    selectedClientRef.current = selectedClient
  }, [selectedClient])

  useEffect(() => {
    onClientChangeRef.current = onClientChange
  }, [onClientChange])

  const normalizePic = useCallback(
    (pic = {}) => ({
      full_name: pic.full_name ?? pic.fullName ?? pic.pic_name ?? '',
      email: pic.email ?? pic.pic_email ?? '',
      mobile_number: pic.mobile_number ?? pic.mobileNumber ?? pic.pic_phone ?? '',
      position: pic.position ?? pic.pic_position ?? '',
    }),
    [],
  )

  const hasPicData = useCallback(
    (pic) => Boolean(pic?.full_name || pic?.email || pic?.mobile_number || pic?.position),
    [],
  )

  const extractPics = useCallback(
    (client) => {
      if (Array.isArray(client.pic_preview) && client.pic_preview.length > 0) {
        return client.pic_preview.map(normalizePic).filter(hasPicData)
      }

      const singlePic = normalizePic(client)
      return hasPicData(singlePic) ? [singlePic] : []
    },
    [hasPicData, normalizePic],
  )

  const normalizeBranch = useCallback(
    (branch = {}) => ({
      branch_id: branch.branch_id ?? null,
      company_id: branch.company_id ?? null,
      branch_name: branch.branch_name ?? '',
      address: branch.address ?? '',
      city: branch.city ?? '',
      state: branch.state ?? '',
      zip: branch.zip ?? '',
      country: branch.country ?? '',
      status: branch.status ?? '',
    }),
    [],
  )

  const normalizeAddressParts = useCallback(
    (entry = {}) => ({
      address: entry.address ?? '',
      city: entry.city ?? '',
      state: entry.state ?? '',
      zip: entry.zip ?? '',
    }),
    [],
  )

  const formatInlineAddress = useCallback(
    ({ address, zip, city, state }) =>
      [address, zip && city ? `${zip} ${city}` : zip || city, state].filter(Boolean).join(', '),
    [],
  )

  const resolveQuoteAddress = useCallback(
    (client, branch = client?.selected_branch || null) => {
      if (!client) return null

      const hq = {
        address: client.hq_address ?? client.address ?? '',
        city: client.hq_city ?? client.city ?? '',
        state: client.hq_state ?? client.state ?? '',
        zip: client.hq_zip ?? client.zip ?? '',
      }

      if (branch) {
        return {
          ...normalizeAddressParts(branch),
        }
      }
      return hq
    },
    [normalizeAddressParts],
  )

  const resolveCompanyName = useCallback((client, branch = client?.selected_branch || null) => {
    const hqName = client?.hq_company_name ?? client?.company_name ?? ''
    if (branch?.branch_name) {
      return `${hqName} - ${branch.branch_name}`
    }
    return hqName
  }, [])

  const withQuoteAddress = useCallback(
    (client, branch = client?.selected_branch ?? null) => {
      if (!client) return null

      const resolved = resolveQuoteAddress(client, branch)
      return {
        ...client,
        hq_company_name: client.hq_company_name ?? client.company_name ?? '',
        company_name: resolveCompanyName(client, branch),
        hq_address: client.hq_address ?? client.address ?? '',
        hq_city: client.hq_city ?? client.city ?? '',
        hq_state: client.hq_state ?? client.state ?? '',
        hq_zip: client.hq_zip ?? client.zip ?? '',
        selected_branch: branch || null,
        address: resolved.address,
        city: resolved.city,
        state: resolved.state,
        zip: resolved.zip,
      }
    },
    [resolveCompanyName, resolveQuoteAddress],
  )

  const fetchCompanyBranches = useCallback(
    async (companyId) => {
      const response = await fetch(quoteApiUrl(`client-companies/${companyId}/branches`), {
        credentials: 'include',
      })
      const result = await response.json()
      if (result.status !== 'success' || !Array.isArray(result.data)) {
        return []
      }
      return result.data.map(normalizeBranch)
    },
    [normalizeBranch],
  )

  const withBranches = useCallback(
    async (client, preferredBranch = null) => {
      if (!client?.company_id) return client
      setLoadingBranches(true)
      try {
        const branches = await fetchCompanyBranches(client.company_id)
        const matchedBranch = preferredBranch?.branch_id
          ? branches.find((b) => String(b.branch_id) === String(preferredBranch.branch_id))
          : null
        const nextClient = {
          ...client,
          all_branches: branches,
          selected_branch: matchedBranch || null,
        }
        return withQuoteAddress(nextClient, matchedBranch || null)
      } catch (err) {
        console.error('Error fetching branches:', err)
        const nextClient = {
          ...client,
          all_branches: [],
          selected_branch: null,
        }
        return withQuoteAddress(nextClient, null)
      } finally {
        setLoadingBranches(false)
      }
    },
    [fetchCompanyBranches, withQuoteAddress],
  )

  const withDefaultPic = useCallback((client) => {
    if (!client) return null
    const pics = Array.isArray(client.all_pics) ? client.all_pics : []
    const selectedPics =
      Array.isArray(client.selected_pics) && client.selected_pics.length > 0
        ? client.selected_pics
        : client.selected_pic
          ? [client.selected_pic]
          : pics[0]
            ? [pics[0]]
            : []

    return {
      ...client,
      selected_pic: selectedPics[0] || null,
      selected_pics: selectedPics,
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const fetchClients = async () => {
      const hasPendingClient = hasPendingCreatedClient()
      if (!cancelled) {
        setLoadingClients(true)
        setAutoSelectingCreatedClient(hasPendingClient)
      }

      try {
        const clients = await fetchAllPagedRecords({
          url: quoteApiUrl('client-companies'),
          dataKeys: ['data'],
          perPage: 200,
        })
        if (cancelled) return

        if (Array.isArray(clients)) {
          const grouped = new Map()

          clients.forEach((client) => {
            const id = client.company_id
            const rowPics = extractPics(client)

            if (!grouped.has(id)) {
              grouped.set(id, {
                company_id: id,
                company_name: client.company_name,
                hq_company_name: client.company_name,
                ssm_number: client.ssm_number,
                address: client.address,
                city: client.city,
                state: client.state,
                zip: client.zip,
                hq_address: client.address,
                hq_city: client.city,
                hq_state: client.state,
                hq_zip: client.zip,
                pic_count: Number(client.pic_count || 0),
                branch_count: Number(client.branch_count || 0),
                branch_summary: client.branch_summary || '',
                all_pics: rowPics,
              })
            } else {
              grouped.get(id).all_pics.push(...rowPics)
            }
          })

          const formatted = Array.from(grouped.values()).map((client) => {
            const picNames = client.all_pics.map((p) => p.full_name).filter(Boolean)
            const additionalCount = Math.max(0, Number(client.pic_count || 0) - picNames.length)
            const picLabel = picNames.length > 0 ? picNames.join(', ') : 'No PIC'

            return {
              value: client.company_id,
              label: `${client.company_name} - ${picLabel}${additionalCount > 0 ? ` (+${additionalCount} more)` : ''}`,
              data: client,
            }
          })

          setClientOptions(formatted)

          const currentSelectedClient = selectedClientRef.current
          const { id: lastCreatedClientId, name: lastCreatedClientName } =
            readPendingCreatedClient()
          if (lastCreatedClientId || lastCreatedClientName) {
            const match = formatted.find((opt) =>
              lastCreatedClientId
                ? String(opt.data.company_id) === String(lastCreatedClientId)
                : opt.data.company_name === lastCreatedClientName,
            )
            if (match) {
              const withPic = withDefaultPic(match.data)
              if (!cancelled) {
                setSelectedPicKeys(
                  getSelectedContacts(withPic).map((pic, index) => contactKey(pic, index)),
                )
              }
              const enriched = await withBranches(withPic, currentSelectedClient?.selected_branch)
              if (!cancelled) {
                onClientChangeRef.current(enriched)
              }
            }
            clearPendingCreatedClient()
            return
          }

          // Rehydrate draft-selected client with latest server data.
          if (currentSelectedClient?.company_id) {
            const matchedClientOption = formatted.find(
              (opt) => String(opt.data.company_id) === String(currentSelectedClient.company_id),
            )

            if (matchedClientOption) {
              const latestClient = matchedClientOption.data
              const savedPics = getSelectedContacts(currentSelectedClient)
              const matchedPics = savedPics
                .map((savedPic) =>
                  latestClient.all_pics.find(
                    (pic) => pic.email === savedPic.email && pic.full_name === savedPic.full_name,
                  ),
                )
                .filter(Boolean)

              const hydratedClient = withDefaultPic({
                ...latestClient,
                selected_pic: matchedPics[0] || latestClient.all_pics?.[0] || null,
                selected_pics:
                  matchedPics.length > 0
                    ? matchedPics
                    : latestClient.all_pics?.[0]
                      ? [latestClient.all_pics[0]]
                      : [],
              })
              const hydratedWithBranches = await withBranches(
                hydratedClient,
                currentSelectedClient?.selected_branch,
              )

              if (!cancelled) {
                setSelectedPicKeys(
                  getSelectedContacts(hydratedWithBranches).map((pic, index) =>
                    contactKey(pic, index),
                  ),
                )
                onClientChangeRef.current(hydratedWithBranches)
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching clients:', err)
      } finally {
        if (!cancelled) {
          setLoadingClients(false)
          setAutoSelectingCreatedClient(false)
        }
      }
    }

    fetchClients()

    return () => {
      cancelled = true
    }
  }, [extractPics, withBranches, withDefaultPic])

  const handleClientSelect = async (selectedOption) => {
    if (selectedOption) {
      const withPic = withDefaultPic(selectedOption.data)
      setSelectedPicKeys(getSelectedContacts(withPic).map((pic, index) => contactKey(pic, index)))
      const enriched = await withBranches(withPic)
      onClientChange(enriched)
    } else {
      setSelectedPicKeys([])
      onClientChange(null)
    }
  }

  const setSelectedContacts = (contacts) => {
    const nextContacts =
      contacts.length > 0
        ? contacts
        : selectedClient.all_pics?.[0]
          ? [selectedClient.all_pics[0]]
          : []
    setSelectedPicKeys(nextContacts.map((pic, index) => contactKey(pic, index)))
    onClientChange({
      ...selectedClient,
      selected_pic: nextContacts[0] || null,
      selected_pics: nextContacts,
    })
  }

  const handleContactToggle = (pic, index) => {
    const key = contactKey(pic, index)
    const currentContacts = getSelectedContacts(selectedClient)
    const isSelected = selectedPicKeys.includes(key)
    const nextContacts = isSelected
      ? currentContacts.filter((contact, contactIndex) => contactKey(contact, contactIndex) !== key)
      : [...currentContacts, pic]

    setSelectedContacts(nextContacts)
  }

  const handleSelectAllContacts = () => {
    setSelectedContacts(selectedClient.all_pics || [])
  }

  const handleSelectPrimaryContact = () => {
    setSelectedContacts(selectedClient.all_pics?.[0] ? [selectedClient.all_pics[0]] : [])
  }

  const handleBranchSelect = (selectedOption) => {
    const nextBranch = selectedOption ? selectedOption.value : null
    onClientChange(withQuoteAddress(selectedClient, nextBranch))
  }

  const getBranchOptionKey = (branch, index = 0) =>
    branch?.branch_id != null ? `branch-${branch.branch_id}` : `branch-${index}`

  const getAddressOptions = (client) => {
    if (!client) return []
    const companyName = client.hq_company_name ?? client.company_name ?? 'Company'

    const hqAddress = formatInlineAddress({
      address: client.hq_address ?? client.address,
      city: client.hq_city ?? client.city,
      state: client.hq_state ?? client.state,
      zip: client.hq_zip ?? client.zip,
    })

    const branchOptions = (client.all_branches || []).map((branch, index) => ({
      key: getBranchOptionKey(branch, index),
      branch,
      title: `${companyName} - ${branch.branch_name || `Branch ${index + 1}`}`,
      address: formatInlineAddress(normalizeAddressParts(branch)),
    }))

    return [
      {
        key: 'hq',
        branch: null,
        title: `${companyName} (HQ)`,
        address: hqAddress,
      },
      ...branchOptions,
    ]
  }

  const handleAddressSelect = (option) => {
    handleBranchSelect(option?.branch ? { value: option.branch } : null)
  }

  const addressOptions = selectedClient ? getAddressOptions(selectedClient) : []
  const hasAddressRadios = addressOptions.length > 1
  const hasContactOptions = (selectedClient?.all_pics?.length || 0) > 1
  const hideCompanySummary = hasAddressRadios && hasContactOptions
  const selectedClientOption = selectedClient
    ? clientOptions.find((opt) => String(opt.value) === String(selectedClient.company_id)) || {
        value: selectedClient.company_id,
        label: `${selectedClient.company_name || selectedClient.hq_company_name || 'Selected client'} - Loading details...`,
        data: selectedClient,
      }
    : null
  const clientLoadingMessage = autoSelectingCreatedClient
    ? 'Loading newly created client...'
    : 'Loading clients...'

  const content = (
    <>
      <CRow className="g-3">
        <CCol md={12}>
          <CFormLabel>Client / Company</CFormLabel>
          <Select
            options={clientOptions}
            value={selectedClientOption}
            onChange={(opt) => {
              setHasTyped(true)
              handleClientSelect(opt)
            }}
            onInputChange={() => setHasTyped(true)}
            placeholder="Search client"
            isClearable
            isLoading={loadingClients || loadingBranches}
            loadingMessage={() => clientLoadingMessage}
            noOptionsMessage={() =>
              loadingClients ? (
                clientLoadingMessage
              ) : hasTyped ? (
                <span>
                  No client found.{' '}
                  <CButton
                    color="primary"
                    variant="outline"
                    size="sm"
                    data-api-busy-allow="true"
                    onClick={() => {
                      if (onCreateClient) {
                        onCreateClient()
                        return
                      }
                      markCameFromQuote()
                      navigate('/client/create')
                    }}
                  >
                    Create one?
                  </CButton>
                </span>
              ) : (
                'Type to search...'
              )
            }
          />
          {loadingClients ? (
            <div className="small text-muted mt-1" aria-live="polite">
              {clientLoadingMessage}
            </div>
          ) : loadingBranches ? (
            <div className="small text-muted mt-1" aria-live="polite">
              Loading client details...
            </div>
          ) : null}
        </CCol>
      </CRow>

      {/* Client Info Display */}
      {selectedClient && (
        <>
          <CRow className="mt-4">
            <CCol md={7}>
              {!hideCompanySummary && (
                <>
                  <CFormLabel>Company Name</CFormLabel>
                  <div>
                    <strong>{selectedClient.company_name}</strong>{' '}
                    <small className="text-muted">
                      (Reg. No.: {selectedClient.ssm_number || '-'})
                    </small>
                    <br />
                    {selectedClient.address}, {selectedClient.city}, {selectedClient.state}{' '}
                    {selectedClient.zip}
                  </div>
                </>
              )}

              {hasAddressRadios && (
                <div className={hideCompanySummary ? '' : 'mt-3'}>
                  <CFormLabel>Quote Address</CFormLabel>
                  <div className="d-flex flex-column gap-2">
                    {addressOptions.map((option) => {
                      const selectedKey = selectedClient.selected_branch
                        ? getBranchOptionKey(selectedClient.selected_branch)
                        : 'hq'
                      const isSelected = selectedKey === option.key

                      return (
                        <label
                          key={option.key}
                          className={`border rounded p-2 d-flex align-items-start gap-2 ${isSelected ? 'border-primary bg-light' : ''}`}
                          style={{ cursor: 'pointer' }}
                        >
                          <CFormCheck
                            type="radio"
                            name="quoteAddress"
                            checked={isSelected}
                            onChange={() => handleAddressSelect(option)}
                          />
                          <div>
                            <strong>{option.title}</strong>
                            <div className="text-muted">{option.address || '-'}</div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  {loadingBranches && (
                    <small className="text-muted">Refreshing branch addresses...</small>
                  )}
                </div>
              )}
            </CCol>

            <CCol md={5}>
              <CFormLabel>Contact Information</CFormLabel>
              {selectedClient.all_pics?.length > 1 ? (
                <div className="d-flex flex-column gap-2">
                  <div className="d-flex gap-2 mb-1">
                    <CButton
                      color="primary"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllContacts}
                    >
                      Select all
                    </CButton>
                    <CButton
                      color="secondary"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectPrimaryContact}
                    >
                      Primary only
                    </CButton>
                  </div>
                  {selectedClient.all_pics.map((pic, index) => {
                    const isSelected = selectedPicKeys.includes(contactKey(pic, index))
                    return (
                      <label
                        key={`${pic.email || 'no-email'}-${pic.full_name || 'no-name'}-${index}`}
                        className={`border rounded p-2 d-flex align-items-start gap-2 ${isSelected ? 'border-primary bg-light' : ''}`}
                        style={{ cursor: 'pointer' }}
                      >
                        <CFormCheck
                          type="checkbox"
                          name="contactPic"
                          checked={isSelected}
                          onChange={() => handleContactToggle(pic, index)}
                        />
                        <div>
                          <strong>
                            {pic.full_name || '-'} {pic.position ? `(${pic.position})` : ''}
                          </strong>
                          <br />
                          {pic.email || '-'}{' '}
                          <small className="text-muted">({pic.mobile_number || '-'})</small>
                        </div>
                      </label>
                    )
                  })}
                </div>
              ) : selectedClient.all_pics?.length === 1 ? (
                <div>
                  <strong>{selectedClient.all_pics[0].full_name}</strong>{' '}
                  <small className="text-muted">({selectedClient.all_pics[0].position})</small>
                  <br />
                  {selectedClient.all_pics[0].email}{' '}
                  <small className="text-muted">({selectedClient.all_pics[0].mobile_number})</small>
                </div>
              ) : (
                <div className="text-muted">No contacts found.</div>
              )}
            </CCol>
          </CRow>
        </>
      )}
    </>
  )

  if (shell === 'none') {
    return <CCol xs={12}>{content}</CCol>
  }

  return (
    <CCol xs={12}>
      <CCard className="mb-4">
        <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
          <strong>{title}</strong>
          {onBack && (
            <CButton size="sm" color="secondary" variant="outline" onClick={onBack}>
              Back
            </CButton>
          )}
        </CCardHeader>
        <CCardBody>{content}</CCardBody>
      </CCard>
    </CCol>
  )
}

export default SelectClientCard
