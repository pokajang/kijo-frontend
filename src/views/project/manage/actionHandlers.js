import dialog from '../../../components/dialog/dialogService'
import { showToast } from '../../../components/toast/toastService'
import { deleteProject, listProjects } from './projectApi'
import { getProjectStatusTone } from './projectStatus'
// src/views/project/actionHandlers.js

// Fetch list of projects
export const fetchProjects = listProjects

// Delete a project; returns true if deletion succeeded
export async function handleDeleteProject(project) {
  if (
    !(await dialog.confirm(
      `Are you sure you want to delete the project "${project.project_name}"?\n\n` +
        `This will permanently delete all associated data and mark the quotation as Failed.`,
      {
        confirmText: 'Delete',
        confirmColor: 'danger',
      },
    ))
  ) {
    return false
  }

  try {
    const result = await deleteProject(project.id)
    if (result.status === 'success') {
      showToast('Project deleted.')
      return true
    }

    dialog.alert(`Deletion blocked: ${result.message || 'Unknown error.'}`)
    return false
  } catch (err) {
    console.error('Delete error:', err)
    dialog.alert(err.message || 'Server error. Please try again later.')
    return false
  }
}

// Determine badge color by status
export const getBadgeColor = getProjectStatusTone
