import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CCardHeader,
  CCardBody,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import ExpenseForm from './ExpenseForm'
import ProfitLossTable from './ProfitLossTable'
import ViewReceiptModal from './ViewReceiptModal'
import dialog from '../../../../../components/dialog/dialogService'
import { showToast } from '../../../../../components/toast/toastService'
import {
  addProjectExpense,
  deleteProjectExpense,
  getCurrentProjectValue,
  toFiniteNumber,
} from '../../projectApi'

const ProfitLossCard = ({ project, vendorPayments, projectExpenses, onDataRefresh }) => {
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [savingExpense, setSavingExpense] = useState(false)
  const [deletingExpenseId, setDeletingExpenseId] = useState(null)
  const [newExpense, setNewExpense] = useState({
    date: '',
    amount: '',
    remarks: '',
    file: null,
  })

  const [receiptModalVisible, setReceiptModalVisible] = useState(false)
  const [selectedReceiptPath, setSelectedReceiptPath] = useState(null)

  const handleViewReceipt = (filePath) => {
    setSelectedReceiptPath(filePath)
    setReceiptModalVisible(true)
  }

  const handleDeleteExpense = async (expenseId) => {
    if (deletingExpenseId != null) return
    if (
      !(await dialog.confirm('Are you sure you want to delete this expense?', {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    )
      return

    try {
      setDeletingExpenseId(expenseId)
      const result = await deleteProjectExpense({
        project_id: project.id,
        expense_id: expenseId,
      })
      if (result.status === 'success') {
        onDataRefresh?.()
        showToast('Expense deleted.')
      } else {
        dialog.alert(result.message || 'Failed to delete expense.')
      }
    } catch (err) {
      console.error('Delete expense error:', err)
      dialog.alert(err.message || 'Failed to delete expense.')
    } finally {
      setDeletingExpenseId(null)
    }
  }

  const revenue = getCurrentProjectValue(project, 0)
  const approvedStatuses = ['approved', 'paid', 'completed', 'transferred']
  const approved = vendorPayments.filter((p) =>
    approvedStatuses.includes((p.status || '').toLowerCase()),
  )
  const pending = vendorPayments.filter((p) => (p.status || '').toLowerCase() === 'pending')

  const totalApproved = approved.reduce((sum, p) => sum + toFiniteNumber(p.amount), 0)
  const totalPending = pending.reduce((sum, p) => sum + toFiniteNumber(p.amount), 0)
  const totalManualExpenses = projectExpenses.reduce((sum, e) => sum + toFiniteNumber(e.amount), 0)

  const confirmedNetProfit = revenue - totalApproved - totalManualExpenses
  const projectedNetProfit = revenue - (totalApproved + totalPending + totalManualExpenses)

  const handleAddExpense = () => setShowExpenseModal(true)

  const handleCancelExpense = () => {
    setNewExpense({ date: '', amount: '', remarks: '', file: null })
    setShowExpenseModal(false)
  }

  const handleSaveExpense = async () => {
    if (savingExpense) return
    const { date, amount, remarks, file } = newExpense
    const parsedAmount = toFiniteNumber(amount, NaN)

    if (!project?.id) {
      dialog.alert('Missing project ID.')
      return
    }

    if (!date || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      dialog.alert('Please enter a valid expense date and amount.')
      return
    }

    const formData = new FormData()
    formData.append('project_id', project.id)
    formData.append('date', date)
    formData.append('amount', amount)
    formData.append('remarks', remarks)
    if (file) formData.append('file', file)

    try {
      setSavingExpense(true)
      const result = await addProjectExpense(formData)
      if (result.status === 'success') {
        handleCancelExpense()
        onDataRefresh?.()
        showToast('Expense saved.')
      } else {
        dialog.alert(result.message || 'Failed to save expense.')
      }
    } catch (err) {
      console.error('Save expense error:', err)
      dialog.alert(err.message || 'Failed to save expense.')
    } finally {
      setSavingExpense(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, files } = e.target
    setNewExpense((prev) => ({ ...prev, [name]: files ? files[0] : value }))
  }

  return (
    <>
      <CCardHeader className="rounded-0 d-flex align-items-center justify-content-between">
        <strong>Profit & Loss Summary</strong>
        <CButton color="primary" variant="outline" size="sm" onClick={handleAddExpense}>
          Add Expense
        </CButton>
      </CCardHeader>
      <CCardBody>
        <ProfitLossTable
          revenue={revenue}
          totalApproved={totalApproved}
          totalPending={totalPending}
          totalManualExpenses={totalManualExpenses}
          confirmedNetProfit={confirmedNetProfit}
          projectedNetProfit={projectedNetProfit}
          projectExpenses={projectExpenses}
          onViewReceipt={handleViewReceipt}
          onDeleteExpense={handleDeleteExpense}
          deletingExpenseId={deletingExpenseId}
        />

        <ViewReceiptModal
          visible={receiptModalVisible}
          filePath={selectedReceiptPath}
          onClose={() => setReceiptModalVisible(false)}
        />
      </CCardBody>

      <CModal visible={showExpenseModal} onClose={handleCancelExpense} alignment="center">
        <CModalHeader closeButton>
          <CModalTitle>Add Expense</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <ExpenseForm formData={newExpense} onChange={handleChange} />
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            size="sm"
            variant="outline"
            onClick={handleCancelExpense}
            disabled={savingExpense}
          >
            Cancel
          </CButton>
          <CButton color="primary" size="sm" onClick={handleSaveExpense} disabled={savingExpense}>
            {savingExpense ? 'Saving...' : 'Save Expense'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

ProfitLossCard.propTypes = {
  project: PropTypes.object,
  vendorPayments: PropTypes.array,
  projectExpenses: PropTypes.array,
  onDataRefresh: PropTypes.func,
}

export default ProfitLossCard
