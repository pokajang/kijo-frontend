import { MOBILE_NAV_ROOT_VIEW } from './mobileNavSheetViews'

export const initialMobileNavSheetState = {
  isOpen: false,
  rootSection: null,
  viewStack: [],
  returnFocusId: null,
}

export const mobileNavSheetReducer = (state, action) => {
  switch (action.type) {
    case 'OPEN_ROOT': {
      const rootView = MOBILE_NAV_ROOT_VIEW[action.section]
      if (!rootView) return state
      return {
        isOpen: true,
        rootSection: action.section,
        viewStack: [{ id: rootView }],
        returnFocusId: action.returnFocusId || null,
      }
    }
    case 'PUSH_VIEW':
      if (!state.isOpen || !action.view?.id) return state
      return { ...state, viewStack: [...state.viewStack, action.view] }
    case 'REPLACE_VIEW':
      if (!state.isOpen || !action.view?.id) return state
      return {
        ...state,
        viewStack: [...state.viewStack.slice(0, -1), action.view],
      }
    case 'POP_VIEW':
      if (state.viewStack.length <= 1) return state
      return { ...state, viewStack: state.viewStack.slice(0, -1) }
    case 'CLOSE':
    case 'RESET_AFTER_ROUTE':
      return initialMobileNavSheetState
    default:
      return state
  }
}
