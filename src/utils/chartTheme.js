import { useColorModes } from '@coreui/react'

const THEME_KEY = 'coreui-free-react-admin-template-theme'

const TICK_LIGHT = '#8c97a6'
const TICK_DARK = '#9aa5b4'

export const useChartTickColor = () => {
  const { colorMode } = useColorModes(THEME_KEY)
  return colorMode === 'dark' ? TICK_DARK : TICK_LIGHT
}
