import React from 'react'
import { CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTrash } from '@coreui/icons'
import { formatDateTime } from '../knowledgeUtils'
import AssistantTooltip from './AssistantTooltip'

const KnowledgeAssistantHistory = ({
  activeAssistantThreadId,
  assistantClearing,
  assistantLoading,
  assistantSending,
  assistantThreads,
  bulkDeleteConfirm,
  deleteConfirmThreadId,
  hasAssistantThreads,
  onClearSelection,
  onDeleteThread,
  onDeleteSelectedThreads,
  onOpenThread,
  onSelectAllThreads,
  onStartNewChat,
  onToggleThreadSelection,
  onWillOpenThread,
  selectedAssistantThreadIds,
}) => {
  const selectedCount = selectedAssistantThreadIds.length
  const allSelected = hasAssistantThreads && selectedCount === assistantThreads.length
  const controlsDisabled = assistantLoading || assistantSending || assistantClearing

  return (
    <div className="knowledge-assistant-history">
      <div className="knowledge-assistant-history-header">
        <div className="knowledge-assistant-history-heading">
          <span className="knowledge-assistant-history-title">Chat history</span>
          <span className="knowledge-assistant-history-notice">Auto-clears after 30 days</span>
        </div>
      </div>

      {hasAssistantThreads ? (
        <>
          <div className="knowledge-assistant-history-bulk">
            <button
              type="button"
              className="knowledge-assistant-history-bulk-select"
              disabled={controlsDisabled}
              onClick={onSelectAllThreads}
            >
              {allSelected ? 'Clear selection' : 'Select all'}
            </button>
            {selectedCount > 0 ? (
              <>
                <span className="knowledge-assistant-history-bulk-count">
                  {selectedCount} selected
                </span>
                <button
                  type="button"
                  className={`knowledge-assistant-history-bulk-delete ${
                    bulkDeleteConfirm ? 'knowledge-assistant-history-bulk-delete--confirm' : ''
                  }`}
                  disabled={controlsDisabled}
                  onClick={onDeleteSelectedThreads}
                >
                  {bulkDeleteConfirm ? 'Confirm delete selected' : 'Delete selected'}
                </button>
                <button
                  type="button"
                  className="knowledge-assistant-history-bulk-clear"
                  disabled={controlsDisabled}
                  onClick={onClearSelection}
                >
                  Cancel
                </button>
              </>
            ) : null}
          </div>

          <div className="knowledge-assistant-thread-list">
            {assistantThreads.map((thread) => {
              const selected = selectedAssistantThreadIds.includes(Number(thread.id))

              return (
                <div
                  key={thread.id}
                  className={`knowledge-assistant-thread ${
                    thread.id === activeAssistantThreadId
                      ? 'knowledge-assistant-thread--active'
                      : ''
                  } ${selected ? 'knowledge-assistant-thread--selected' : ''}`}
                >
                  <label className="knowledge-assistant-thread-select">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={controlsDisabled}
                      aria-label={`Select chat ${thread.title || 'New chat'}`}
                      onChange={() => onToggleThreadSelection(thread.id)}
                    />
                  </label>
                  <AssistantTooltip content={`Open chat: ${thread.title || 'New chat'}`}>
                    <button
                      type="button"
                      className="knowledge-assistant-thread-main"
                      onClick={() => {
                        onWillOpenThread()
                        onOpenThread(thread.id)
                      }}
                    >
                      <span className="knowledge-assistant-thread-title">
                        {thread.title || 'New chat'}
                      </span>
                      {thread.last_message_at ? (
                        <span className="knowledge-assistant-thread-meta">
                          {formatDateTime(thread.last_message_at)}
                        </span>
                      ) : null}
                    </button>
                  </AssistantTooltip>
                  <AssistantTooltip
                    content={
                      deleteConfirmThreadId === thread.id ? 'Confirm delete chat' : 'Delete chat'
                    }
                  >
                    <button
                      type="button"
                      className={`knowledge-assistant-thread-delete ${
                        deleteConfirmThreadId === thread.id
                          ? 'knowledge-assistant-thread-delete--confirm'
                          : ''
                      }`}
                      aria-label={`${
                        deleteConfirmThreadId === thread.id ? 'Confirm delete chat' : 'Delete chat'
                      } ${thread.title || 'New chat'}`}
                      disabled={controlsDisabled}
                      onClick={() => onDeleteThread(thread.id)}
                    >
                      {deleteConfirmThreadId === thread.id ? (
                        <span>Confirm</span>
                      ) : (
                        <CIcon icon={cilTrash} />
                      )}
                    </button>
                  </AssistantTooltip>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="knowledge-assistant-history-empty">
          <span>History is empty, start a</span>
          <CButton
            color="primary"
            size="sm"
            variant="outline"
            type="button"
            className="knowledge-assistant-history-empty-action"
            disabled={controlsDisabled}
            onClick={onStartNewChat}
          >
            new chat
          </CButton>
          <span>.</span>
        </div>
      )}
    </div>
  )
}

export default KnowledgeAssistantHistory
