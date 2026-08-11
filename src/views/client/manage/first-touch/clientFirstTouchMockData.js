export const FIRST_TOUCH_STAFF_OPTIONS = [
  staff(11, 'Sarah Lim', 'SL', '2021-02-01'),
  staff(12, 'Hafiz Omar', 'HO', '2022-06-15'),
  staff(13, 'Daniel Lee', 'DL', '2020-01-06', '2025-12-31', 'resigned'),
  staff(14, 'Aina Yusuf', 'AY', '2023-03-01'),
  staff(15, 'Current user', 'CU', '2024-01-01'),
  staff(16, 'Nur Aisyah', 'NA', '2019-05-20', '2023-12-31', 'resigned'),
  staff(17, 'Razak Musa', 'RM', '2018-04-02', '2024-06-30', 'terminated'),
]

function staff(id, fullName, nameCode, startedAt, endedAt = null, departureType = null) {
  return { id, fullName, nameCode, startedAt, endedAt, departureType }
}

const BASE_FIRST_TOUCH_RECORDS = [
  {
    companyId: 399,
    companyName: 'TNB REPAIR AND MAINTENANCE SDN BHD',
    firstTouch: {
      id: 1001,
      status: 'current',
      sourceGroup: 'Digital',
      channel: 'LinkedIn',
      method: 'Organic post',
      occurredAt: '2024-03-14',
      clientContact: 'John Tan',
      amioshContact: 'Sarah Lim',
      inquiryRef: 'INQ-2024-00128',
      notes: 'Client contact responded after reading a workplace safety compliance post.',
      submittedBy: 'Sarah Lim',
      submittedAt: '2024-03-15T09:20:00',
      proofCount: 2,
      proofs: [
        {
          id: 1,
          platform: 'LinkedIn',
          author: 'John Tan',
          date: '14 Mar 2024',
          text: 'Just came across a great article on workplace safety compliance. Appreciate the insights shared, Sarah Lim.',
        },
        {
          id: 2,
          platform: 'LinkedIn',
          author: 'Sarah Lim',
          date: '14 Mar 2024',
          text: 'Thanks for reaching out. I have shared our compliance service overview and contact details.',
        },
      ],
    },
    contribution: {
      awarded: 1460000,
      invoiced: 1320000,
      collected: 1280000,
      grossProfit: 312000,
      asOf: '2026-08-11',
    },
    projects: [
      {
        id: 701,
        name: 'Annual OSH Retainer 2024',
        awarded: 420000,
        invoiced: 420000,
        collected: 420000,
        grossProfit: 96000,
        salesOwner: 'Aina Yusuf',
        salesOwnerCode: 'AY',
        status: 'paid',
      },
      {
        id: 702,
        name: 'Plant Maintenance Audit',
        awarded: 310000,
        invoiced: 310000,
        collected: 285000,
        grossProfit: 67000,
        salesOwner: 'Daniel Lee',
        salesOwnerCode: 'DL',
        status: 'partially_paid',
      },
      {
        id: 703,
        name: 'Safety Training Programme',
        awarded: 180000,
        invoiced: 180000,
        collected: 180000,
        grossProfit: 43000,
        salesOwner: 'Hafiz Omar',
        salesOwnerCode: 'HO',
        status: 'paid',
      },
      {
        id: 704,
        name: 'Turnaround Safety Support',
        awarded: 550000,
        invoiced: 410000,
        collected: 395000,
        grossProfit: 106000,
        salesOwner: 'Aina Yusuf',
        salesOwnerCode: 'AY',
        status: 'active',
      },
    ],
    timeline: [
      {
        id: 1,
        date: '2024-03-14',
        title: 'First documented encounter',
        description: 'John Tan responded to a LinkedIn workplace safety post shared by Sarah Lim.',
        type: 'origin',
      },
      {
        id: 2,
        date: '2024-03-18',
        title: 'Sales inquiry created',
        description: 'Inquiry INQ-2024-00128 recorded for consultancy and compliance support.',
        type: 'inquiry',
      },
      {
        id: 3,
        date: '2024-03-25',
        title: 'Physical meeting',
        description: 'Initial requirements meeting with the maintenance management team.',
        type: 'meeting',
      },
      {
        id: 4,
        date: '2024-04-08',
        title: 'First project awarded',
        description: 'Annual OSH Retainer 2024 awarded with sales credit assigned to Aina Yusuf.',
        type: 'award',
      },
    ],
  },
  {
    companyId: 401,
    companyName: 'MEGATECH PRECISION INDUSTRIES SDN BHD',
    firstTouch: {
      id: 1002,
      status: 'current',
      sourceGroup: 'Messaging',
      channel: 'WhatsApp',
      method: 'Personal message',
      occurredAt: '2025-09-02',
      clientContact: 'Elaine Wong',
      amioshContact: 'Hafiz Omar',
      inquiryRef: 'INQ-2025-00304',
      notes: 'Contact requested a training proposal through WhatsApp.',
      submittedBy: 'Current user',
      submittedAt: '2025-09-02T14:40:00',
      proofCount: 1,
      proofs: [
        {
          id: 3,
          platform: 'WhatsApp',
          author: 'Elaine Wong',
          date: '2 Sep 2025',
          text: 'Hi, I was given your number and would like to ask about safety training for our operators.',
        },
      ],
    },
    contribution: {
      awarded: 265000,
      invoiced: 210000,
      collected: 195000,
      grossProfit: 52000,
      asOf: '2026-08-11',
    },
    projects: [
      {
        id: 711,
        name: 'Operator Safety Training',
        awarded: 265000,
        invoiced: 210000,
        collected: 195000,
        grossProfit: 52000,
        salesOwner: 'Hafiz Omar',
        salesOwnerCode: 'HO',
        status: 'partially_paid',
      },
    ],
    timeline: [],
  },
  {
    companyId: 402,
    companyName: 'JOHOR PORT SERVICES BERHAD',
    firstTouch: null,
    contribution: {
      awarded: 890000,
      invoiced: 740000,
      collected: 710000,
      grossProfit: 188000,
      asOf: '2026-08-11',
    },
    projects: [
      {
        id: 721,
        name: 'Port Hygiene Monitoring',
        awarded: 890000,
        invoiced: 740000,
        collected: 710000,
        grossProfit: 188000,
        salesOwner: '',
        salesOwnerCode: '',
        status: 'active',
      },
    ],
    timeline: [],
  },
  {
    companyId: 403,
    companyName: 'GREENFIELD MANUFACTURING (M) SDN BHD',
    firstTouch: {
      id: 1003,
      status: 'current',
      sourceGroup: 'Referral',
      channel: 'Former staff',
      method: 'Referral',
      occurredAt: '2023-06-21',
      clientContact: 'Nurul Izzah',
      amioshContact: 'Daniel Lee',
      inquiryRef: 'INQ-2023-00077',
      notes: 'Introduced by a former Amiosh project coordinator.',
      submittedBy: 'Daniel Lee',
      submittedAt: '2023-06-22T10:10:00',
      proofCount: 1,
      proofs: [
        {
          id: 4,
          platform: 'Referral message',
          author: 'Former staff',
          date: '21 Jun 2023',
          text: 'Connecting Greenfield Manufacturing with Amiosh for their upcoming compliance programme.',
        },
      ],
    },
    contribution: {
      awarded: 640000,
      invoiced: 640000,
      collected: 640000,
      grossProfit: 174000,
      asOf: '2026-08-11',
    },
    projects: [],
    timeline: [],
  },
  {
    companyId: 404,
    companyName: 'NUSANTARA ENGINEERING SDN BHD',
    firstTouch: {
      id: 1004,
      status: 'current',
      sourceGroup: 'Phone',
      channel: 'Office phone',
      method: 'Inbound call',
      occurredAt: '2025-01-17',
      clientContact: 'Muhammad Fikri',
      amioshContact: 'Aina Yusuf',
      inquiryRef: 'INQ-2025-00042',
      notes: 'Caller obtained the office number from an industry event directory.',
      submittedBy: 'Aina Yusuf',
      submittedAt: '2025-01-17T16:10:00',
      proofCount: 1,
      proofs: [
        {
          id: 5,
          platform: 'Call log',
          author: 'Office line',
          date: '17 Jan 2025',
          text: 'Incoming call · 8 minutes 42 seconds · Contact saved as Muhammad Fikri.',
        },
      ],
    },
    contribution: {
      awarded: 380000,
      invoiced: 380000,
      collected: 340000,
      grossProfit: 91000,
      asOf: '2026-08-11',
    },
    projects: [],
    timeline: [],
  },
  {
    companyId: 405,
    companyName: 'PROSAFE RESOURCES SDN BHD',
    firstTouch: {
      id: 1005,
      status: 'contested',
      sourceGroup: 'Digital',
      channel: 'Facebook',
      method: 'Direct message',
      occurredAt: '2024-11-05',
      clientContact: 'Amanda Lee',
      amioshContact: 'Sarah Lim',
      inquiryRef: 'INQ-2024-00491',
      notes: 'An earlier event introduction may exist and is awaiting evidence.',
      submittedBy: 'Sarah Lim',
      submittedAt: '2024-11-05T12:00:00',
      proofCount: 1,
      proofs: [
        {
          id: 6,
          platform: 'Facebook',
          author: 'Amanda Lee',
          date: '5 Nov 2024',
          text: 'Hello, we would like to know more about your occupational health services.',
        },
      ],
    },
    contribution: {
      awarded: 120000,
      invoiced: 120000,
      collected: 92000,
      grossProfit: 21000,
      asOf: '2026-08-11',
    },
    projects: [],
    timeline: [],
  },
]

export const createUnknownFirstTouchRecord = (companyId) => ({
  companyId: Number(companyId) || 0,
  companyName: `Client #${companyId}`,
  firstTouch: null,
  claims: [],
  disputes: [],
  conflict: null,
  contribution: {
    awarded: 0,
    invoiced: 0,
    collected: 0,
    grossProfit: 0,
    asOf: '2026-08-11',
  },
  projects: [],
  timeline: [],
})

const normalizeRecord = (record) => {
  if (!record.firstTouch) {
    return { ...record, claims: [], disputes: [], conflict: null }
  }

  const currentClaim = {
    ...record.firstTouch,
    status: record.firstTouch.status,
    revisions: [],
  }

  if (record.companyId !== 405) {
    return {
      ...record,
      firstTouch: currentClaim,
      claims: [currentClaim],
      disputes: [],
      conflict: null,
    }
  }

  const competingClaim = {
    id: 1006,
    status: 'competing',
    sourceGroup: 'Direct / field',
    channel: 'Physical meeting',
    method: 'Face-to-face',
    occurredAt: '2024-08-19',
    clientContact: 'Amanda Lee',
    amioshContact: 'Daniel Lee',
    inquiryRef: '',
    notes: 'Earlier introduction documented at an industry networking event.',
    submittedBy: 'Daniel Lee',
    submittedAt: '2026-08-10T10:30:00',
    proofCount: 1,
    proofs: [
      {
        id: 7,
        platform: 'Event photograph',
        author: 'Daniel Lee',
        date: '19 Aug 2024',
        text: 'Event photograph and attendee note showing the introduction before the Facebook message.',
      },
    ],
    revisions: [],
  }

  return {
    ...record,
    firstTouch: currentClaim,
    claims: [currentClaim, competingClaim],
    disputes: [],
    conflict: {
      id: 'conflict-405',
      status: 'open',
      openedAt: '2026-08-10T10:30:00',
      currentClaimId: currentClaim.id,
      competingClaimIds: [competingClaim.id],
      disputeIds: [],
    },
  }
}

export const FIRST_TOUCH_RECORDS = BASE_FIRST_TOUCH_RECORDS.map(normalizeRecord)
