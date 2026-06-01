import React from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CAlert,
  CFormCheck,
  CButton,
} from '@coreui/react'
import { SYSTEM_DEFAULT_PAYMENT_TERMS_DAYS } from '../../../shared/paymentTerms'

const CompanyDetails = ({
  title = 'Company Details',
  clientDetails,
  handleInputChange,
  isDuplicateCompany,
  duplicateCompanyName,
  partialMatchCompany,
  branchList = [],
  setBranchList,
  editableBranchList = false,
  onBranchListFieldChange,
  showBranchForm = false,
  setShowBranchForm,
  currentBranch,
  handleBranchInputChange,
  addBranchToList,
  onBack,
  footerActions,
  children,
}) => {
  const isInternational = clientDetails.country && clientDetails.country !== 'Malaysia'

  // Wrap country change so we can clean related fields
  const handleCountryChange = (e) => {
    const { value } = e.target

    if (value === 'Malaysia') {
      // back to Malaysia: remove intl country, keep state as-is
      handleInputChange({ target: { name: 'country', value } })
      handleInputChange({ target: { name: 'intlCountry', value: '' } })
    } else {
      // switching to Other: clear state and ask for proper country name
      handleInputChange({ target: { name: 'country', value } })
      handleInputChange({ target: { name: 'state', value: '' } })
    }
  }

  const trimOnBlur = (name) => (e) => {
    let v = (e.target.value || '').trim()

    // Remove any punctuation marks (comma, semicolon, colon, slash, etc.)
    // that appear at the end of the text
    v = v.replace(/[\s,;:/\\.!-]+$/g, '')

    if (v !== e.target.value) {
      handleInputChange({ target: { name, value: v } })
    }
  }

  const handleRemoveBranch = (index) => {
    if (!setBranchList) return
    const updated = branchList.filter((_, i) => i !== index)
    setBranchList(updated)
  }

  const getBranchValue = (branch, camelKey, snakeKey = camelKey) =>
    branch?.[camelKey] ?? branch?.[snakeKey] ?? ''

  const handleExistingBranchCountryChange = (index, value) => {
    if (typeof onBranchListFieldChange !== 'function') return
    onBranchListFieldChange(index, 'country', value)
    if (value === 'Malaysia') {
      onBranchListFieldChange(index, 'intlCountry', '')
    } else {
      onBranchListFieldChange(index, 'state', '')
    }
  }

  const handleToggleBranchForm = (e) => {
    if (!setShowBranchForm) return
    setShowBranchForm(e.target.checked)
  }

  const isBranchInternational = currentBranch?.country && currentBranch.country !== 'Malaysia'

  const handleBranchCountryChange = (e) => {
    const { value } = e.target

    if (value === 'Malaysia') {
      handleBranchInputChange({ target: { name: 'country', value } })
      handleBranchInputChange({ target: { name: 'intlCountry', value: '' } })
    } else {
      handleBranchInputChange({ target: { name: 'country', value } })
      handleBranchInputChange({ target: { name: 'state', value: '' } })
    }
  }

  const trimBranchOnBlur = (name) => (e) => {
    let v = (e.target.value || '').trim()
    v = v.replace(/[\s,;:/\\.!-]+$/g, '')

    if (v !== e.target.value) {
      handleBranchInputChange({ target: { name, value: v } })
    }
  }

  return (
    <CCard className="mb-3">
      <CCardHeader>
        <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
          <strong>{title}</strong>
          <CButton size="sm" color="secondary" variant="outline" onClick={onBack}>
            Back
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3">
          <CCol md={8}>
            <CFormLabel htmlFor="companyName">
              Company Name <span className="text-danger">*</span>
            </CFormLabel>
            <CFormInput
              type="text"
              id="companyName"
              name="companyName"
              value={clientDetails.companyName}
              onChange={handleInputChange}
              onBlur={trimOnBlur('companyName')}
            />
            {isDuplicateCompany && (
              <CAlert color="danger" className="mt-2 mb-0 py-2">
                <strong>{duplicateCompanyName}</strong> already exists. If this is a branch, append
                a branch remark in the name, for example:
                <strong> XYZ Sdn Bhd - KL Branch</strong>.
              </CAlert>
            )}
            {!isDuplicateCompany && partialMatchCompany && (
              <CAlert color="primary" className="mt-2 mb-0 py-2">
                <strong>{partialMatchCompany}</strong> looks similar. If this is a branch, append a
                branch remark in the name, for example:
                <strong> XYZ Sdn Bhd - KL Branch</strong>.
              </CAlert>
            )}
          </CCol>

          <CCol md={4}>
            <CFormLabel htmlFor="ssmNumber">SSM Number (if applicable)</CFormLabel>
            <CFormInput
              id="ssmNumber"
              name="ssmNumber"
              value={clientDetails.ssmNumber}
              onChange={handleInputChange}
              onBlur={trimOnBlur('ssmNumber')}
              placeholder="e.g., 202401234567"
            />
          </CCol>

          <CCol md={4}>
            <CFormLabel htmlFor="taxIdNoTin">Tax Id. No. (TIN)</CFormLabel>
            <CFormInput
              id="taxIdNoTin"
              name="taxIdNoTin"
              value={clientDetails.taxIdNoTin}
              onChange={handleInputChange}
              onBlur={trimOnBlur('taxIdNoTin')}
              placeholder="e.g., C1234567890"
            />
          </CCol>

          <CCol md={4}>
            <CFormLabel htmlFor="clientStatus">Client Status</CFormLabel>
            <CFormSelect
              id="clientStatus"
              name="clientStatus"
              value={clientDetails.clientStatus}
              onChange={handleInputChange}
            >
              <option value="">Choose status</option>
              <option value="Old">Old</option>
              <option value="New">New</option>
            </CFormSelect>
          </CCol>

          <CCol md={4}>
            <CFormLabel>Payment Terms</CFormLabel>
            <div className="d-flex align-items-center gap-4 flex-wrap">
              <CFormCheck
                type="radio"
                id="paymentTermsDefault"
                name="useDefaultPaymentTerms"
                label={`Default (${SYSTEM_DEFAULT_PAYMENT_TERMS_DAYS} days)`}
                checked={Boolean(clientDetails.useDefaultPaymentTerms)}
                onChange={() =>
                  handleInputChange({
                    target: { name: 'useDefaultPaymentTerms', type: 'checkbox', checked: true },
                  })
                }
              />
              <CFormCheck
                type="radio"
                id="paymentTermsCustom"
                name="useDefaultPaymentTerms"
                label="Custom"
                checked={!clientDetails.useDefaultPaymentTerms}
                onChange={() =>
                  handleInputChange({
                    target: { name: 'useDefaultPaymentTerms', type: 'checkbox', checked: false },
                  })
                }
              />
            </div>
            {!clientDetails.useDefaultPaymentTerms && (
              <CFormInput
                className="mt-2"
                type="number"
                min="0"
                max="365"
                id="paymentTermsDays"
                name="paymentTermsDays"
                value={clientDetails.paymentTermsDays}
                onChange={handleInputChange}
                placeholder="e.g., 30"
              />
            )}
          </CCol>

          {/* Country selector */}
          <CCol md={4}>
            <CFormLabel htmlFor="country">
              Country <span className="text-danger">*</span>
            </CFormLabel>
            <CFormSelect
              id="country"
              name="country"
              value={clientDetails.country}
              onChange={handleCountryChange}
            >
              <option value="Malaysia">Malaysia</option>
              <option value="Other">Other (specify)</option>
            </CFormSelect>
          </CCol>

          {/* When "Other", ask for country name */}
          {isInternational && (
            <CCol md={4}>
              <CFormLabel htmlFor="intlCountry">
                Country Name <span className="text-danger">*</span>
              </CFormLabel>
              <CFormInput
                id="intlCountry"
                name="intlCountry"
                placeholder="e.g., Singapore, United Kingdom, United States"
                value={clientDetails.intlCountry}
                onChange={handleInputChange}
                onBlur={trimOnBlur('intlCountry')}
              />
            </CCol>
          )}

          <CCol xs={12}>
            <CFormLabel htmlFor="address">Address</CFormLabel>
            <CFormInput
              id="address"
              name="address"
              value={clientDetails.address}
              onChange={handleInputChange}
              onBlur={trimOnBlur('address')}
              placeholder="Street address"
            />
          </CCol>

          <CCol md={4}>
            <CFormLabel htmlFor="city">City</CFormLabel>
            <CFormInput
              id="city"
              name="city"
              value={clientDetails.city}
              onChange={handleInputChange}
              onBlur={trimOnBlur('city')}
              placeholder={isInternational ? 'e.g., Singapore, London' : 'e.g., Shah Alam'}
            />
          </CCol>

          <CCol md={4}>
            <CFormLabel htmlFor="state">
              {isInternational ? 'State / Province / Region' : 'State'}
            </CFormLabel>

            {/* Malaysia: keep dropdown. International: use free text. */}
            {!isInternational ? (
              <CFormSelect
                id="state"
                name="state"
                value={clientDetails.state}
                onChange={handleInputChange}
              >
                <option value="">Choose state</option>
                <option value="Johor">Johor</option>
                <option value="Kedah">Kedah</option>
                <option value="Kelantan">Kelantan</option>
                <option value="Melaka">Melaka</option>
                <option value="Negeri Sembilan">Negeri Sembilan</option>
                <option value="Pahang">Pahang</option>
                <option value="Perak">Perak</option>
                <option value="Perlis">Perlis</option>
                <option value="Pulau Pinang">Pulau Pinang</option>
                <option value="Sabah">Sabah</option>
                <option value="Sarawak">Sarawak</option>
                <option value="Selangor">Selangor</option>
                <option value="Terengganu">Terengganu</option>
                <option value="Wilayah Persekutuan Kuala Lumpur">
                  Wilayah Persekutuan Kuala Lumpur
                </option>
                <option value="Wilayah Persekutuan Labuan">Wilayah Persekutuan Labuan</option>
                <option value="Wilayah Persekutuan Putrajaya">Wilayah Persekutuan Putrajaya</option>
              </CFormSelect>
            ) : (
              <CFormInput
                id="state"
                name="state"
                value={clientDetails.state}
                onChange={handleInputChange}
                onBlur={trimOnBlur('state')}
                placeholder="e.g., California, Ontario, Greater London"
              />
            )}
          </CCol>

          <CCol md={4}>
            <CFormLabel htmlFor="zip">{isInternational ? 'Postal Code' : 'Zip Code'}</CFormLabel>
            <CFormInput
              id="zip"
              name="zip"
              value={clientDetails.zip}
              onChange={handleInputChange}
              onBlur={trimOnBlur('zip')}
              placeholder={isInternational ? 'e.g., 90210, SW1A 1AA, 10200' : 'e.g., 40150'}
            />
          </CCol>

          <CCol xs={12}>
            <hr className="my-2" />
          </CCol>

          <CCol xs={12}>
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <CFormCheck
                id="enableBranches"
                label="Add Branch"
                checked={showBranchForm}
                onChange={handleToggleBranchForm}
              />
              {branchList.length > 0 && (
                <small className="text-muted">{branchList.length} branch(es) added</small>
              )}
            </div>
            <small className="text-muted d-block mt-1">
              Use this only if the branch shares the same SSM and TIN as HQ. Otherwise, create a
              separate client record.
            </small>
          </CCol>

          {showBranchForm && (
            <>
              {branchList.length > 0 && (
                <CCol xs={12}>
                  <div className="mb-1 d-flex flex-column gap-2">
                    {branchList.map((branch, index) => (
                      <div key={index} className="border rounded p-2 d-flex flex-column gap-2">
                        {editableBranchList && typeof onBranchListFieldChange === 'function' ? (
                          <>
                            <div className="d-flex align-items-center justify-content-between gap-2">
                              <strong>
                                {getBranchValue(branch, 'branchName', 'branch_name') ||
                                  `Branch ${index + 1}`}
                              </strong>
                              <CButton
                                size="sm"
                                color="danger"
                                variant="outline"
                                onClick={() => handleRemoveBranch(index)}
                              >
                                Remove
                              </CButton>
                            </div>
                            <CRow className="g-3">
                              <CCol md={3}>
                                <CFormLabel>Branch Name</CFormLabel>
                                <CFormInput
                                  value={getBranchValue(branch, 'branchName', 'branch_name')}
                                  onChange={(e) =>
                                    onBranchListFieldChange(index, 'branchName', e.target.value)
                                  }
                                />
                              </CCol>
                              <CCol md={5}>
                                <CFormLabel>Address</CFormLabel>
                                <CFormInput
                                  value={getBranchValue(branch, 'address')}
                                  onChange={(e) =>
                                    onBranchListFieldChange(index, 'address', e.target.value)
                                  }
                                />
                              </CCol>
                              <CCol md={2}>
                                <CFormLabel>City</CFormLabel>
                                <CFormInput
                                  value={getBranchValue(branch, 'city')}
                                  onChange={(e) =>
                                    onBranchListFieldChange(index, 'city', e.target.value)
                                  }
                                />
                              </CCol>
                              <CCol md={2}>
                                <CFormLabel>
                                  {(branch.country || 'Malaysia') === 'Malaysia'
                                    ? 'Zip'
                                    : 'Postal Code'}
                                </CFormLabel>
                                <CFormInput
                                  value={getBranchValue(branch, 'zip')}
                                  onChange={(e) =>
                                    onBranchListFieldChange(index, 'zip', e.target.value)
                                  }
                                />
                              </CCol>
                              <CCol md={3}>
                                <CFormLabel>Country</CFormLabel>
                                <CFormSelect
                                  value={getBranchValue(branch, 'country') || 'Malaysia'}
                                  onChange={(e) =>
                                    handleExistingBranchCountryChange(index, e.target.value)
                                  }
                                >
                                  <option value="Malaysia">Malaysia</option>
                                  <option value="Other">Other (specify)</option>
                                </CFormSelect>
                              </CCol>
                              {(getBranchValue(branch, 'country') || 'Malaysia') !== 'Malaysia' && (
                                <CCol md={3}>
                                  <CFormLabel>Country Name</CFormLabel>
                                  <CFormInput
                                    value={getBranchValue(branch, 'intlCountry', 'intl_country')}
                                    onChange={(e) =>
                                      onBranchListFieldChange(index, 'intlCountry', e.target.value)
                                    }
                                  />
                                </CCol>
                              )}
                              <CCol md={3}>
                                <CFormLabel>
                                  {(getBranchValue(branch, 'country') || 'Malaysia') === 'Malaysia'
                                    ? 'State'
                                    : 'State / Province / Region'}
                                </CFormLabel>
                                {(getBranchValue(branch, 'country') || 'Malaysia') ===
                                'Malaysia' ? (
                                  <CFormSelect
                                    value={getBranchValue(branch, 'state')}
                                    onChange={(e) =>
                                      onBranchListFieldChange(index, 'state', e.target.value)
                                    }
                                  >
                                    <option value="">Choose state</option>
                                    <option value="Johor">Johor</option>
                                    <option value="Kedah">Kedah</option>
                                    <option value="Kelantan">Kelantan</option>
                                    <option value="Melaka">Melaka</option>
                                    <option value="Negeri Sembilan">Negeri Sembilan</option>
                                    <option value="Pahang">Pahang</option>
                                    <option value="Perak">Perak</option>
                                    <option value="Perlis">Perlis</option>
                                    <option value="Pulau Pinang">Pulau Pinang</option>
                                    <option value="Sabah">Sabah</option>
                                    <option value="Sarawak">Sarawak</option>
                                    <option value="Selangor">Selangor</option>
                                    <option value="Terengganu">Terengganu</option>
                                    <option value="Wilayah Persekutuan Kuala Lumpur">
                                      Wilayah Persekutuan Kuala Lumpur
                                    </option>
                                    <option value="Wilayah Persekutuan Labuan">
                                      Wilayah Persekutuan Labuan
                                    </option>
                                    <option value="Wilayah Persekutuan Putrajaya">
                                      Wilayah Persekutuan Putrajaya
                                    </option>
                                  </CFormSelect>
                                ) : (
                                  <CFormInput
                                    value={getBranchValue(branch, 'state')}
                                    onChange={(e) =>
                                      onBranchListFieldChange(index, 'state', e.target.value)
                                    }
                                  />
                                )}
                              </CCol>
                            </CRow>
                          </>
                        ) : (
                          <>
                            <div>
                              <strong>
                                {getBranchValue(branch, 'branchName', 'branch_name') ||
                                  `Branch ${index + 1}`}
                              </strong>
                            </div>
                            <div className="text-muted small">
                              {getBranchValue(branch, 'address')}
                              {(getBranchValue(branch, 'city') ||
                                getBranchValue(branch, 'state') ||
                                getBranchValue(branch, 'zip')) &&
                                `, ${getBranchValue(branch, 'zip')} ${getBranchValue(branch, 'city')} ${getBranchValue(branch, 'state')}`}
                            </div>
                            <div className="text-muted small">
                              {getBranchValue(branch, 'country') === 'Other'
                                ? getBranchValue(branch, 'intlCountry', 'intl_country') || 'Other'
                                : getBranchValue(branch, 'country') || 'Malaysia'}
                            </div>
                            <CButton
                              size="sm"
                              color="danger"
                              variant="outline"
                              className="align-self-end"
                              onClick={() => handleRemoveBranch(index)}
                            >
                              Remove
                            </CButton>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </CCol>
              )}

              <CCol xs={12}>
                <CRow className="g-3">
                  <CCol md={3}>
                    <CFormLabel>Branch Name</CFormLabel>
                    <CFormInput
                      name="branchName"
                      value={currentBranch?.branchName || ''}
                      onChange={handleBranchInputChange}
                      onBlur={trimBranchOnBlur('branchName')}
                      placeholder="e.g. HQ / Penang"
                    />
                  </CCol>

                  <CCol md={isBranchInternational ? 5 : 7}>
                    <CFormLabel>Address</CFormLabel>
                    <CFormInput
                      name="address"
                      value={currentBranch?.address || ''}
                      onChange={handleBranchInputChange}
                      onBlur={trimBranchOnBlur('address')}
                      placeholder="Street address"
                    />
                  </CCol>

                  <CCol md={2}>
                    <CFormLabel>
                      Country <span className="text-danger">*</span>
                    </CFormLabel>
                    <CFormSelect
                      name="country"
                      value={currentBranch?.country || 'Malaysia'}
                      onChange={handleBranchCountryChange}
                    >
                      <option value="Malaysia">Malaysia</option>
                      <option value="Other">Other (specify)</option>
                    </CFormSelect>
                  </CCol>

                  {isBranchInternational && (
                    <CCol md={2}>
                      <CFormLabel>
                        Country Name <span className="text-danger">*</span>
                      </CFormLabel>
                      <CFormInput
                        name="intlCountry"
                        value={currentBranch?.intlCountry || ''}
                        onChange={handleBranchInputChange}
                        onBlur={trimBranchOnBlur('intlCountry')}
                        placeholder="e.g., Singapore, United Kingdom, United States"
                      />
                    </CCol>
                  )}
                </CRow>
              </CCol>

              <CCol xs={12}>
                <CRow className="g-3">
                  <CCol md={4}>
                    <CFormLabel>City</CFormLabel>
                    <CFormInput
                      name="city"
                      value={currentBranch?.city || ''}
                      onChange={handleBranchInputChange}
                      onBlur={trimBranchOnBlur('city')}
                      placeholder={
                        isBranchInternational ? 'e.g., Singapore, London' : 'e.g., Shah Alam'
                      }
                    />
                  </CCol>

                  <CCol md={4}>
                    <CFormLabel>
                      {isBranchInternational ? 'State / Province / Region' : 'State'}
                    </CFormLabel>
                    {!isBranchInternational ? (
                      <CFormSelect
                        name="state"
                        value={currentBranch?.state || ''}
                        onChange={handleBranchInputChange}
                      >
                        <option value="">Choose state</option>
                        <option value="Johor">Johor</option>
                        <option value="Kedah">Kedah</option>
                        <option value="Kelantan">Kelantan</option>
                        <option value="Melaka">Melaka</option>
                        <option value="Negeri Sembilan">Negeri Sembilan</option>
                        <option value="Pahang">Pahang</option>
                        <option value="Perak">Perak</option>
                        <option value="Perlis">Perlis</option>
                        <option value="Pulau Pinang">Pulau Pinang</option>
                        <option value="Sabah">Sabah</option>
                        <option value="Sarawak">Sarawak</option>
                        <option value="Selangor">Selangor</option>
                        <option value="Terengganu">Terengganu</option>
                        <option value="Wilayah Persekutuan Kuala Lumpur">
                          Wilayah Persekutuan Kuala Lumpur
                        </option>
                        <option value="Wilayah Persekutuan Labuan">
                          Wilayah Persekutuan Labuan
                        </option>
                        <option value="Wilayah Persekutuan Putrajaya">
                          Wilayah Persekutuan Putrajaya
                        </option>
                      </CFormSelect>
                    ) : (
                      <CFormInput
                        name="state"
                        value={currentBranch?.state || ''}
                        onChange={handleBranchInputChange}
                        onBlur={trimBranchOnBlur('state')}
                        placeholder="e.g., California, Ontario, Greater London"
                      />
                    )}
                  </CCol>

                  <CCol md={4}>
                    <CFormLabel>{isBranchInternational ? 'Postal Code' : 'Zip Code'}</CFormLabel>
                    <CFormInput
                      name="zip"
                      value={currentBranch?.zip || ''}
                      onChange={handleBranchInputChange}
                      onBlur={trimBranchOnBlur('zip')}
                      placeholder={
                        isBranchInternational ? 'e.g., 90210, SW1A 1AA, 10200' : 'e.g., 40150'
                      }
                    />
                  </CCol>
                </CRow>
              </CCol>

              <CCol xs={12} className="d-flex justify-content-end">
                <CButton color="primary" size="sm" onClick={addBranchToList}>
                  Add Branch
                </CButton>
              </CCol>
            </>
          )}
        </CRow>
      </CCardBody>
      {children}
      {footerActions}
    </CCard>
  )
}

export default CompanyDetails
