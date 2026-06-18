import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'

import FrozenVendorTable from './FrozenVendorTable'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { vendorModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import {
  fetchVendorsByStatus,
  handleDeactivateVendor,
  handleReactivateVendor,
} from './actionHandlers'
import { getCurrentReturnTo } from '../../../utils/navigation/returnTo'

const FrozenVendors = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [inactiveVendors, setInactiveVendors] = useState([])

  const fetchInactiveVendors = () => fetchVendorsByStatus('inactive', () => {}, setInactiveVendors)

  useEffect(() => {
    fetchInactiveVendors()
  }, [])

  return (
    <CRow>
      <CCol xs={12}>
        <ModuleNavStrip tabs={vendorModuleTabs} ariaLabel="Vendor sections" />
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Frozen Vendors</strong>
          </CCardHeader>
          <CCardBody>
            <FrozenVendorTable
              inactiveVendors={inactiveVendors}
              onDeleteVendor={(vendor) =>
                handleDeactivateVendor(vendor, setInactiveVendors, fetchInactiveVendors)
              }
              onReactivateVendor={(vendor) => handleReactivateVendor(vendor, fetchInactiveVendors)}
              onViewVendor={(vendor) =>
                navigate(`/vendor/frozen/${vendor.id}`, {
                  state: { record: vendor, returnTo: getCurrentReturnTo(location) },
                })
              }
            />
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default FrozenVendors
