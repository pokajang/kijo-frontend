import React, { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCombobox } from 'downshift'
import { CButton, CModal, CModalBody, CModalHeader, CModalTitle, CTooltip } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch } from '@coreui/icons'
import { useAuth } from '../../auth/AuthProvider'
import { extractRolesFromSession } from '../../utils/roles'
import { getModuleSearchResults, recordModuleSearchSelection } from './moduleSearchIndex'

const itemToString = (item) => (item ? `${item.group}, ${item.label}` : '')

const ModuleSearchBox = ({
  roles,
  onNavigate,
  autoFocus = false,
  inputLabel = 'Search modules',
}) => {
  const [inputValue, setInputValue] = useState('')
  const searchResults = useMemo(
    () => getModuleSearchResults(inputValue, roles),
    [inputValue, roles],
  )
  const hasQuery = inputValue.trim() !== ''
  const items = hasQuery ? searchResults.results : searchResults.recentResults

  const combobox = useCombobox({
    items,
    inputValue,
    itemToString,
    onInputValueChange: ({ inputValue: nextInputValue = '' }) => {
      setInputValue(nextInputValue)
    },
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) {
        recordModuleSearchSelection(selectedItem.id)
        onNavigate(selectedItem)
        setInputValue('')
      }
    },
    stateReducer: (state, actionAndChanges) => {
      const { changes, type } = actionAndChanges

      if (type === useCombobox.stateChangeTypes.InputKeyDownEscape) {
        return {
          ...changes,
          selectedItem: null,
          highlightedIndex: -1,
          inputValue: '',
          isOpen: false,
        }
      }

      if (
        type === useCombobox.stateChangeTypes.ItemClick ||
        type === useCombobox.stateChangeTypes.InputKeyDownEnter
      ) {
        return {
          ...changes,
          inputValue: '',
          isOpen: false,
        }
      }

      return changes
    },
  })

  const {
    getInputProps,
    getItemProps,
    getLabelProps,
    getMenuProps,
    highlightedIndex,
    isOpen,
    openMenu,
  } = combobox

  const showResults = isOpen && (hasQuery || items.length > 0)
  const showEmpty = showResults && hasQuery && items.length === 0
  const showSuggestion = showResults && hasQuery && searchResults.suggestion

  const applySuggestion = () => {
    setInputValue(searchResults.suggestion.correctedQuery)
    openMenu()
  }

  return (
    <div className="app-module-search">
      <label className="visually-hidden" {...getLabelProps()}>
        {inputLabel}
      </label>
      <div className="app-module-search__field">
        <input
          {...getInputProps({
            autoFocus,
            className: 'app-module-search__input',
            placeholder: 'Search modules or action...',
            'aria-label': inputLabel,
            onFocus: openMenu,
          })}
        />
      </div>
      <ul
        {...getMenuProps({
          className: `app-module-search__results${showResults ? ' is-open' : ''}`,
        })}
      >
        {showResults && (
          <>
            {!hasQuery && items.length > 0 && (
              <li className="app-module-search__section-label">Recent</li>
            )}
            {showSuggestion && (
              <li className="app-module-search__suggestion">
                <button
                  type="button"
                  className="app-module-search__suggestion-button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={applySuggestion}
                >
                  Did you mean "{searchResults.suggestion.correctedQuery}"?
                </button>
              </li>
            )}
            {items.length > 0
              ? items.map((item, index) => (
                  <li
                    key={item.id}
                    {...getItemProps({
                      item,
                      index,
                      className: `app-module-search__result${
                        highlightedIndex === index ? ' is-active' : ''
                      }`,
                      'aria-label': itemToString(item),
                    })}
                  >
                    <span className="app-module-search__result-label">{item.label}</span>
                    <span className="app-module-search__result-separator" aria-hidden="true">
                      -
                    </span>
                    <span className="app-module-search__result-group">{item.group}</span>
                  </li>
                ))
              : showEmpty && <li className="app-module-search__empty">No modules found</li>}
          </>
        )}
      </ul>
    </div>
  )
}

const AppModuleSearch = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const roles = useMemo(() => extractRolesFromSession({ user }), [user])
  const [mobileSearchVisible, setMobileSearchVisible] = useState(false)
  const triggerRef = useRef(null)

  const handleNavigate = (item) => {
    setMobileSearchVisible(false)
    navigate(item.to)
  }

  const closeMobileSearch = () => {
    setMobileSearchVisible(false)
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => triggerRef.current?.focus())
      return
    }
    triggerRef.current?.focus()
  }

  return (
    <>
      <div className="app-module-search-shell d-none d-md-flex">
        <ModuleSearchBox roles={roles} onNavigate={handleNavigate} />
      </div>

      <CTooltip content="Search modules" placement="left">
        <CButton
          ref={triggerRef}
          type="button"
          color="primary"
          className="app-module-search-fab d-md-none"
          aria-label="Search modules"
          onClick={() => setMobileSearchVisible(true)}
        >
          <CIcon icon={cilSearch} />
        </CButton>
      </CTooltip>

      <CModal
        visible={mobileSearchVisible}
        onClose={closeMobileSearch}
        className="app-module-search-modal"
      >
        <CModalHeader closeButton>
          <CModalTitle>Search Modules</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <ModuleSearchBox roles={roles} onNavigate={handleNavigate} autoFocus />
        </CModalBody>
      </CModal>
    </>
  )
}

export default AppModuleSearch
