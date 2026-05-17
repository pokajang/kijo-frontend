import React from 'react'
import MonthlyQuoteValueWidget from './MonthlyQuoteValueWidget'
import QuoteValueByServiceMonthly from './QuoteValueByServiceMonthly'
import QuoteValueByService from './QuoteValueByService'
import QuoteActivityByStaff from './QuoteActivityByStaff'
import InquirySourceMix from './InquirySourceMix'

const CrmDashboard = ({ period, startDate, endDate }) => (
  <section className="mb-5">
    <MonthlyQuoteValueWidget period={period} startDate={startDate} endDate={endDate} />
    <QuoteValueByServiceMonthly startDate={startDate} endDate={endDate} />
    <QuoteValueByService startDate={startDate} endDate={endDate} />
    <QuoteActivityByStaff startDate={startDate} endDate={endDate} />
    <InquirySourceMix startDate={startDate} endDate={endDate} />
  </section>
)

export default CrmDashboard
