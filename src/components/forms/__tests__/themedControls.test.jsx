import { describe, expect, it } from 'vitest'
import { getTinyMceThemedInit } from '../ThemedTinyMCEEditor'
import { mergeReactSelectStyles, themedReactSelectTheme } from '../ThemedSelect'

describe('themed form controls', () => {
  it('applies theme-token surfaces to react-select styles', () => {
    const styles = mergeReactSelectStyles()
    const control = styles.control({}, { isFocused: false })
    const menu = styles.menu({})
    const option = styles.option({}, { isFocused: true, isSelected: false })

    expect(control.backgroundColor).toBe('var(--cui-body-bg)')
    expect(control.borderColor).toBe('var(--cui-border-color)')
    expect(menu.backgroundColor).toBe('var(--cui-body-bg)')
    expect(option.backgroundColor).toBe('var(--app-accent-bg-hover)')
  })

  it('preserves react-select custom styles after applying themed defaults', () => {
    const styles = mergeReactSelectStyles({
      control: (base) => ({ ...base, minHeight: 44 }),
      option: (base) => ({ ...base, textTransform: 'capitalize' }),
    })

    const control = styles.control({}, { isFocused: true })
    const option = styles.option({}, { isFocused: false, isSelected: false })

    expect(control.backgroundColor).toBe('var(--cui-body-bg)')
    expect(control.borderColor).toBe('var(--cui-primary)')
    expect(control.minHeight).toBe(44)
    expect(option.color).toBe('var(--cui-body-color)')
    expect(option.textTransform).toBe('capitalize')
  })

  it('maps react-select theme colors to app tokens', () => {
    const theme = themedReactSelectTheme({ colors: { danger: 'red' } })

    expect(theme.colors.neutral0).toBe('var(--cui-body-bg)')
    expect(theme.colors.neutral80).toBe('var(--cui-body-color)')
    expect(theme.colors.primary25).toBe('var(--app-accent-bg-hover)')
    expect(theme.colors.danger).toBe('red')
  })

  it('sets TinyMCE dark skin and iframe content styles in dark mode', () => {
    const init = getTinyMceThemedInit(
      { height: 320, content_style: 'p { line-height: 1.5; }' },
      true,
    )

    expect(init.skin).toBe('oxide-dark')
    expect(init.content_css).toBe('dark')
    expect(init.height).toBe(320)
    expect(init.content_style).toContain('background: #1c1f23')
    expect(init.content_style).toContain('p { line-height: 1.5; }')
  })

  it('sets TinyMCE light skin and content css in light mode', () => {
    const init = getTinyMceThemedInit({}, false)

    expect(init.skin).toBe('oxide')
    expect(init.content_css).toBe('default')
    expect(init.content_style).toContain('background: #ffffff')
  })
})
