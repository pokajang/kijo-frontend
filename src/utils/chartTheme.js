import { useMemo } from 'react'
import { useColorModes } from '@coreui/react'
import { getStyle } from '@coreui/utils'

const THEME_KEY = 'coreui-free-react-admin-template-theme'

const TICK_LIGHT = '#8c97a6'
const TICK_DARK = '#9aa5b4'

export const useChartTickColor = () => {
  const { colorMode } = useColorModes(THEME_KEY)
  return colorMode === 'dark' ? TICK_DARK : TICK_LIGHT
}

const chartColorFallbacks = {
  primary: '#4f5dff',
  success: '#2eb85c',
  warning: '#f9b115',
  danger: '#e55353',
  info: '#3399ff',
  secondary: '#6b7785',
}

const getCoreUiColor = (name, _colorMode) => getStyle(`--cui-${name}`) || chartColorFallbacks[name]

export const useChartSemanticColors = () => {
  const { colorMode } = useColorModes(THEME_KEY)

  return useMemo(
    () => ({
      primary: getCoreUiColor('primary', colorMode),
      success: getCoreUiColor('success', colorMode),
      warning: getCoreUiColor('warning', colorMode),
      danger: getCoreUiColor('danger', colorMode),
      info: getCoreUiColor('info', colorMode),
      secondary: getCoreUiColor('secondary', colorMode),
    }),
    [colorMode],
  )
}

export const useChartPalette = () => {
  const colors = useChartSemanticColors()

  return useMemo(
    () => [
      colors.primary,
      colors.success,
      colors.warning,
      colors.danger,
      colors.info,
      colors.secondary,
    ],
    [colors],
  )
}
