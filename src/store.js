import { configureStore, createSlice } from '@reduxjs/toolkit'

const initialState = {
  sidebarShow: true,
  theme: 'light',
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    set: (state, action) => ({ ...state, ...action.payload }),
  },
})

const appReducer = (state, action) => {
  if (action.type === 'set') {
    const rest = { ...action }
    delete rest.type
    return appSlice.reducer(state, appSlice.actions.set(rest))
  }
  return appSlice.reducer(state, action)
}

const store = configureStore({
  reducer: appReducer,
})

export default store
