import React from 'react'
import MonthlyIncomeStatement from './MonthlyIncomeStatement'

const FinancialDashboard = ({ startDate, endDate }) => (
  <section className="mb-5">
    <MonthlyIncomeStatement startDate={startDate} endDate={endDate} />
  </section>
)

export default FinancialDashboard
