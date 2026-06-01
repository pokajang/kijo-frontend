import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilGroup,
  cilApplications,
  cilDescription,
  cilPaintBucket,
  cilMoney,
  cilLifeRing,
  cilChartPie,
  cilBook,
  cilPuzzle,
  cilSpeedometer,
  cilStar,
  cilCalculator,
  cilSoccer,
  cilAddressBook,
  cilInbox,
  cilSettings,
} from '@coreui/icons'
import { CNavItem, CNavTitle } from '@coreui/react'

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },

  // CRM Management
  {
    component: CNavTitle,
    name: 'CRM Management',
  },
  {
    component: CNavItem,
    name: 'Pipeline CRM',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
    to: '/pipeline/find',
    activePaths: ['/pipeline', '/calls'],
  },

  {
    component: CNavItem,
    name: 'Clients',
    to: '/client/manage',
    activePaths: [
      '/client/manage',
      '/client/create',
      '/client/roi',
      '/client/vendor-registration',
      '/client/past-pics',
    ],
    icon: <CIcon icon={cilAddressBook} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Quotations',
    icon: <CIcon icon={cilCalculator} customClassName="nav-icon" />,
    to: '/crm/records',
    activePaths: ['/crm/records', '/crm/quotes'],
  },
  {
    component: CNavItem,
    name: 'Negotiations',
    icon: <CIcon icon={cilInbox} customClassName="nav-icon" />,
    to: '/crm/price-exceptions',
    activePaths: ['/crm/price-exceptions'],
  },

  // Template Management
  {
    component: CNavItem,
    name: 'Proposals',
    icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
    to: '/templates/proposals',
    activePaths: ['/templates/proposals', '/templates/create'],
  },

  {
    component: CNavItem,
    name: 'Projects',
    to: '/project/manage',
    activePaths: ['/project/manage', '/project/create'],
    icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
  },

  {
    component: CNavItem,
    name: 'Commercial',
    icon: <CIcon icon={cilMoney} customClassName="nav-icon" />,
    to: '/commercial/invoice',
    activePaths: ['/commercial'],
  },

  {
    component: CNavItem,
    name: 'Vendors',
    icon: <CIcon icon={cilPaintBucket} customClassName="nav-icon" />,
    to: '/vendor/payment-records',
    activePaths: ['/vendor'],
  },

  {
    component: CNavItem,
    name: 'Catalog',
    icon: <CIcon icon={cilSoccer} customClassName="nav-icon" />,
    to: '/catalog/manage',
    activePaths: ['/catalog'],
  },

  // Internal Operations
  {
    component: CNavTitle,
    name: 'Internal Operations',
  },
  // Employee Management (only visible to Admin, HR & Manager)
  {
    component: CNavItem,
    name: 'Staff Management',
    to: '/staff/leaves',
    icon: <CIcon icon={cilGroup} customClassName="nav-icon" />,
    allowedRoles: ['System Admin', 'HR', 'Manager'],
    activePaths: ['/staff'],
  },

  {
    component: CNavItem,
    name: 'Administration',
    to: '/administration/meetings',
    activePaths: ['/administration', '/meetings', '/procedure', '/sport-time'],
    icon: <CIcon icon={cilBook} customClassName="nav-icon" />,
  },

  {
    component: CNavItem,
    name: 'Financial',
    to: '/financial/salary-records',
    activePaths: ['/financial'],
    icon: <CIcon icon={cilMoney} customClassName="nav-icon" />,
    allowedRoles: ['System Admin', 'Manager', 'HR', 'Finance', 'Account', 'Bank'],
    notificationRouteGroups: ['/financial/salary-records', '/financial/other-claim-records'],
  },

  {
    component: CNavItem,
    name: 'Workflows',
    to: '/workflows/salary-application',
    activePaths: ['/workflows'],
    icon: <CIcon icon={cilApplications} customClassName="nav-icon" />,
    allowedRoles: ['System Admin', 'Manager', 'HR', 'Finance', 'Account', 'Bank'],
  },

  {
    component: CNavItem,
    name: 'Support',
    to: '/support/requests',
    activePaths: ['/support', '/request-tool', '/feedback'],
    icon: <CIcon icon={cilLifeRing} customClassName="nav-icon" />,
  },

  // Extras pages or tools
  {
    component: CNavTitle,
    name: 'Tools & Resources',
  },
  {
    component: CNavItem,
    name: 'Handbook',
    to: '/handbook',
    icon: <CIcon icon={cilPuzzle} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: (
      <>
        Learn
        <strong style={{ marginLeft: '0.25rem' }}>kijo</strong>
      </>
    ),
    to: '/knowledge',
    icon: <CIcon icon={cilBook} customClassName="nav-icon" />,
    badge: {
      color: 'info',
      text: 'New',
      title: 'New resource',
    },
  },
  {
    component: CNavItem,
    name: 'Internal Tools',
    to: '/internal-tools',
    icon: <CIcon icon={cilApplications} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'System Admin',
    to: '/system-admin/dashboard',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
    allowedRoles: ['System Admin'],
  },
]

export default _nav
