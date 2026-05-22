export const complianceStatusOptions = ['Compliant', 'Partial', 'Non-compliant', 'Not observed']

export const applicabilityOptions = ['Applicable', 'Not Applicable']

export const legalComplianceSections = [
  {
    id: 'osha-1994',
    title: 'Occupational Safety and Health Act (OSHA) 1994',
    clauses: [
      {
        id: 'osha-15a',
        reference: 'Section 15(a), OSHA 1994',
        title: 'Duty to Establish Safe Operating Procedure (SOP) for All Work Activities',
        excerpt:
          "'(a) provide and maintain system of works that are safe and without risk to health.'",
      },
      {
        id: 'osha-15b',
        reference: 'Section 15(b), OSHA 1994',
        title: 'Duty to Establish Risk Assessment to All Work Activities',
        excerpt:
          "'(b) make arrangements to ensure absence of safety and health risks related to operation, handling, storage and transportation of plant and substances.'",
      },
      {
        id: 'osha-15c',
        reference: 'Section 15(c), OSHA 1994',
        title:
          'Duty to Inform, Instruct, Train and Supervise all Employees, Visitors and Contractors',
        excerpt:
          "'(c) provide information, instruction, training and supervision related to safety and health to all employees and related personnel.'",
      },
    ],
  },
]
