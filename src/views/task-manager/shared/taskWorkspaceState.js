export const getTaskWorkspaceView = (search) =>
  new URLSearchParams(search).get('view') === 'weekly' ? 'weekly' : 'tasks'

export const applyTaskWorkspaceView = (search, view) => {
  const params = new URLSearchParams(search)

  if (view === 'weekly') params.set('view', 'weekly')
  else params.delete('view')

  return params.toString()
}
