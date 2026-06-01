export const initialModalState = {
  fail: { visible: false, recordId: null, reason: '', serviceKey: null },
  success: {
    visible: false,
    recordId: null,
    reason: '',
    awardDate: null,
    description: '',
    clientLoaRefNo: '',
    actionType: 'award',
    serviceKey: null,
  },
  followUp: {
    visible: false,
    quote: null,
    remarks: '',
    date: '',
    serviceKey: null,
  },
}

export const modalReducer = (state, action) => {
  switch (action.type) {
    case 'OPEN_FAIL':
      return {
        ...state,
        fail: {
          visible: true,
          recordId: action.payload.recordId,
          reason: '',
          serviceKey: action.payload.serviceKey,
        },
      }
    case 'CLOSE_FAIL':
      return { ...state, fail: { visible: false, recordId: null, reason: '', serviceKey: null } }
    case 'SET_FAIL_REASON':
      return { ...state, fail: { ...state.fail, reason: action.payload } }

    case 'OPEN_SUCCESS':
      return {
        ...state,
        success: {
          visible: true,
          recordId: action.payload.recordId,
          reason: '',
          awardDate: null,
          description: '',
          clientLoaRefNo: '',
          actionType: action.payload.actionType || 'award',
          serviceKey: action.payload.serviceKey,
        },
      }
    case 'CLOSE_SUCCESS':
      return {
        ...state,
        success: {
          visible: false,
          recordId: null,
          reason: '',
          awardDate: null,
          description: '',
          clientLoaRefNo: '',
          actionType: 'award',
          serviceKey: null,
        },
      }
    case 'SET_SUCCESS_REASON':
      return { ...state, success: { ...state.success, reason: action.payload } }
    case 'SET_SUCCESS_DATE':
      return { ...state, success: { ...state.success, awardDate: action.payload } }
    case 'SET_SUCCESS_DESCRIPTION':
      return { ...state, success: { ...state.success, description: action.payload } }
    case 'SET_SUCCESS_LOA':
      return { ...state, success: { ...state.success, clientLoaRefNo: action.payload } }

    case 'OPEN_FOLLOWUP':
      return {
        ...state,
        followUp: {
          visible: true,
          quote: action.payload.quote,
          remarks: '',
          date: '',
          serviceKey: action.payload.serviceKey,
        },
      }
    case 'CLOSE_FOLLOWUP':
      return {
        ...state,
        followUp: { visible: false, quote: null, remarks: '', date: '', serviceKey: null },
      }
    case 'SET_FOLLOWUP_REMARKS':
      return { ...state, followUp: { ...state.followUp, remarks: action.payload } }
    case 'SET_FOLLOWUP_DATE':
      return { ...state, followUp: { ...state.followUp, date: action.payload } }

    default:
      return state
  }
}
