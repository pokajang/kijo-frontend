import { describe, expect, it } from 'vitest'
import {
  calculateMileageAmount,
  calculateSalarySummary,
  calculateStatutoryDeductions,
} from './salaryCalculations'

describe('salaryCalculations', () => {
  it('calculates EPF, SOCSO, and EIS contributions from basic salary', () => {
    expect(calculateStatutoryDeductions(3000)).toEqual({
      employerEpf: 390,
      employeeEpf: 330,
      employerSocso: 51.65,
      employeeSocso: 14.75,
      employerEis: 5.9,
      employeeEis: 5.9,
      employerTotal: 447.55,
      employeeTotal: 350.65,
    })
  })

  it('calculates mileage claims at the configured rate', () => {
    expect(calculateMileageAmount(42)).toBe(50.4)
  })

  it('summarizes salary, claims, deductions, and payable salary', () => {
    const summary = calculateSalarySummary({
      basicSalary: 3000,
      allowanceItems: [{ amount: 120 }],
      expenseItems: [{ amount: 80 }],
      mileageItems: [{ amount: 25.2 }],
      medicalItems: [{ amount: 40 }],
    })

    expect(summary.totalMedical).toBe(40)
    expect(summary.claimsTotal).toBe(265.2)
    expect(summary.deductions.employeeTotal).toBe(350.65)
    expect(summary.payableSalary).toBe(2914.55)
  })
})
