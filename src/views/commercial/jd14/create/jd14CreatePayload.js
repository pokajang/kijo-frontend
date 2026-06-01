export const buildJD14CreatePayload = ({
  project,
  employerDetails,
  employerCode,
  trainingDetails,
}) => ({
  project_id: project?.id,
  employer_name: employerDetails.employerName,
  employer_address: employerDetails.address,
  approval_no: employerDetails.approvalNo,
  employer_code: employerCode,
  group_approved: employerDetails.groupApproved,
  group_claimed: employerDetails.groupClaimed,
  course_title: trainingDetails.topic,
  training_venue: trainingDetails.trainingVenue,
  commenced_date: trainingDetails.commencedDate,
  end_date: trainingDetails.endDate,
  no_of_pax: trainingDetails.noOfPax,
  total_fee_approved: trainingDetails.amountApproved,
  total_fee_claimed: trainingDetails.amountClaimed,
})

export const createJD14Form = async (payload) => {
  const response = await fetch(`${import.meta.env.VITE_API_BASE}jd14-forms`, {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json()
}
