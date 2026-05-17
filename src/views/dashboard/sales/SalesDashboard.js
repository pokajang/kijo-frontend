import React from 'react'
import MonthlySalesWidget from './MonthlySalesWidget'
import AwardedValueByService from './AwardedValueByService'
import AwardedValueByPerson from './AwardedValueByPerson'
import AwardedValueBySource from './AwardedValueBySource'
import ConversionRateByStaff from './ConversionRateByStaff'
import ConversionRateBySource from './ConversionRateBySource'
import ConversionRateByService from './ConversionRateByService'

const SalesDashboard = ({ period, startDate, endDate }) => (
  <section className="mb-5">
    <MonthlySalesWidget period={period} startDate={startDate} endDate={endDate} />
    <AwardedValueByService startDate={startDate} endDate={endDate} />
    <AwardedValueByPerson startDate={startDate} endDate={endDate} />
    <AwardedValueBySource startDate={startDate} endDate={endDate} />
    <ConversionRateByStaff startDate={startDate} endDate={endDate} />
    <ConversionRateBySource startDate={startDate} endDate={endDate} />
    <ConversionRateByService startDate={startDate} endDate={endDate} />
  </section>
)

export default SalesDashboard
