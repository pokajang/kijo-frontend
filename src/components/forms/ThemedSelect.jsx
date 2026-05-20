import React from 'react'
import Select from 'react-select'

const controlBorderColor = (state) =>
  state.isFocused ? 'var(--cui-primary)' : 'var(--cui-border-color)'

const themedSelectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--cui-body-bg)',
    borderRadius: 'var(--cui-border-radius)',
    borderColor: controlBorderColor(state),
    boxShadow: state.isFocused
      ? 'var(--cui-box-shadow-inset), 0 0 0 0.25rem rgba(var(--cui-primary-rgb), 0.25)'
      : 'var(--cui-box-shadow-inset)',
    color: 'var(--cui-body-color)',
    minHeight: 'calc(1.5em + 0.75rem + 2px)',
    '&:hover': {
      borderColor: controlBorderColor(state),
    },
  }),
  valueContainer: (base) => ({
    ...base,
    color: 'var(--cui-body-color)',
    padding: '0.375rem 0.75rem',
  }),
  input: (base) => ({
    ...base,
    color: 'var(--cui-body-color)',
    margin: 0,
    padding: 0,
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--cui-body-color)',
    margin: 0,
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'var(--app-surface-subtle)',
    border: '1px solid var(--app-border)',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'var(--cui-body-color)',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'var(--app-text-action)',
    ':hover': {
      backgroundColor: 'var(--app-btn-muted-bg-hover)',
      color: 'var(--app-text-action-hover)',
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--cui-body-color)',
    margin: 0,
  }),
  indicatorSeparator: (base) => ({
    ...base,
    display: 'none',
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? 'var(--cui-primary)' : 'var(--cui-body-color)',
    padding: '0 0.75rem',
    ':hover': {
      color: 'var(--cui-body-color)',
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'var(--cui-body-color)',
    padding: '0 0.5rem',
    ':hover': {
      color: 'var(--cui-body-color)',
    },
  }),
  indicatorsContainer: (base) => ({
    ...base,
    minHeight: 'calc(1.5em + 0.75rem)',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--cui-body-bg)',
    border: '1px solid var(--cui-border-color)',
    boxShadow: 'var(--app-shadow-lg)',
    color: 'var(--cui-body-color)',
    overflow: 'hidden',
    zIndex: 20,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 2000,
  }),
  menuList: (base) => ({
    ...base,
    backgroundColor: 'var(--cui-body-bg)',
    color: 'var(--cui-body-color)',
    padding: 4,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'var(--cui-primary)'
      : state.isFocused
        ? 'var(--app-accent-bg-hover)'
        : 'var(--cui-body-bg)',
    color: state.isSelected ? 'var(--cui-white)' : 'var(--cui-body-color)',
    cursor: 'pointer',
    ':active': {
      backgroundColor: state.isSelected ? 'var(--cui-primary)' : 'var(--app-accent-bg-active)',
    },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: 'var(--app-text-muted)',
  }),
  loadingMessage: (base) => ({
    ...base,
    color: 'var(--app-text-muted)',
  }),
}

const mergeStyleFn = (baseFn, customFn) => (base, state) => {
  const themed = baseFn ? baseFn(base, state) : base
  return customFn ? customFn(themed, state) : themed
}

export const mergeReactSelectStyles = (customStyles = {}) => {
  const safeCustomStyles = customStyles || {}
  const merged = { ...safeCustomStyles }

  Object.entries(themedSelectStyles).forEach(([key, baseFn]) => {
    merged[key] = mergeStyleFn(baseFn, safeCustomStyles[key])
  })

  return merged
}

export const themedReactSelectTheme = (theme) => ({
  ...theme,
  borderRadius: 6,
  colors: {
    ...theme.colors,
    primary: 'var(--cui-primary)',
    primary25: 'var(--app-accent-bg-hover)',
    primary50: 'var(--app-accent-bg-active)',
    neutral0: 'var(--cui-body-bg)',
    neutral5: 'var(--app-surface-raised)',
    neutral10: 'var(--app-surface-subtle)',
    neutral20: 'var(--app-border-card)',
    neutral30: 'var(--cui-border-color)',
    neutral40: 'var(--cui-body-color)',
    neutral50: 'var(--app-text-muted)',
    neutral60: 'var(--app-text-secondary)',
    neutral70: 'var(--cui-body-color)',
    neutral80: 'var(--cui-body-color)',
    neutral90: 'var(--cui-body-color)',
  },
})

const combineClassNames = (...classNames) => classNames.filter(Boolean).join(' ')

const ThemedSelect = ({ className, classNamePrefix = 'react-select', styles, theme, ...props }) => (
  <Select
    className={combineClassNames('react-select-container', className)}
    classNamePrefix={classNamePrefix}
    styles={mergeReactSelectStyles(styles)}
    theme={(baseTheme) => {
      const themedBase = themedReactSelectTheme(baseTheme)
      return typeof theme === 'function' ? theme(themedBase) : themedBase
    }}
    {...props}
  />
)

export default ThemedSelect
