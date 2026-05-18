// src/components/Jd14Modal/TrainingDetails.jsx

import React, { useState, useEffect } from 'react'
import {
  CCardHeader,
  CCardBody,
  CForm,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormCheck,
  CFormTextarea,
} from '@coreui/react'

const TrainingDetails = ({ trainingDetails, onChange, employerAddress }) => {
  // local state for radio selector
  const [venueOption, setVenueOption] = useState('same')

  // whenever the radio changes, update the field
  useEffect(() => {
    const nextVenue = venueOption === 'same' ? employerAddress : ''
    if (trainingDetails.trainingVenue === nextVenue) return

    onChange('trainingVenue')({ target: { value: nextVenue } })
  }, [venueOption, employerAddress, onChange, trainingDetails.trainingVenue])

  return (
    <>
      <CCardHeader>
        <strong>Training Details</strong>
      </CCardHeader>
      <CCardBody>
        <CForm>
          <CRow>
            {/* Row 1a: radio selector */}
            <CCol md={12}>
              <CFormLabel>Venue Option</CFormLabel>
              <div>
                <CFormCheck
                  inline
                  type="radio"
                  name="venueOption"
                  label="Same as above"
                  checked={venueOption === 'same'}
                  onChange={() => setVenueOption('same')}
                />
                <CFormCheck
                  inline
                  type="radio"
                  name="venueOption"
                  label="Other Venue"
                  checked={venueOption === 'other'}
                  onChange={() => setVenueOption('other')}
                />
              </div>
            </CCol>

            {/* Row 1b: Training Venue */}
            <CCol md={12} className="mt-3">
              <CFormLabel>Training Venue</CFormLabel>
              <CFormTextarea
                value={trainingDetails.trainingVenue}
                onChange={onChange('trainingVenue')}
                rows={2}
              />
            </CCol>

            {/* Row 2: Course Title (12) */}
            <CCol md={12} className="mt-3">
              <CFormLabel>Course Title</CFormLabel>
              <CFormInput value={trainingDetails.topic} onChange={onChange('topic')} />
            </CCol>

            {/* Row 3: Start & End Dates (6 / 6) */}
            <CCol md={6} className="mt-3">
              <CFormLabel>Training Dates - Commenced</CFormLabel>
              <CFormInput
                type="date"
                value={trainingDetails.commencedDate}
                onChange={onChange('commencedDate')}
              />
            </CCol>
            <CCol md={6} className="mt-3">
              <CFormLabel>Training Dates - Ended</CFormLabel>
              <CFormInput
                type="date"
                value={trainingDetails.endDate}
                onChange={onChange('endDate')}
              />
            </CCol>

            {/* Row 4: No. of Trainees / Approved / Claimed (4/4/4) */}
            <CCol md={4} className="mt-3">
              <CFormLabel>No. of Trainee(s)*</CFormLabel>
              <CFormInput
                type="number"
                value={trainingDetails.noOfPax}
                onChange={onChange('noOfPax')}
              />
            </CCol>
            <CCol md={4} className="mt-3">
              <CFormLabel>Total Fee Approved (RM)</CFormLabel>
              <CFormInput
                type="number"
                value={trainingDetails.amountApproved}
                onChange={onChange('amountApproved')}
              />
            </CCol>
            <CCol md={4} className="mt-3">
              <CFormLabel>Total Fee Claimed (RM)</CFormLabel>
              <CFormInput
                type="number"
                value={trainingDetails.amountClaimed}
                onChange={onChange('amountClaimed')}
              />
            </CCol>
          </CRow>
        </CForm>
      </CCardBody>
    </>
  )
}

export default TrainingDetails
