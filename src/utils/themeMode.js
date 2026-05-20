import { useColorModes } from '@coreui/react'

export const COREUI_THEME_KEY = 'coreui-free-react-admin-template-theme'

export const useAppColorMode = () => {
  const { colorMode } = useColorModes(COREUI_THEME_KEY)
  return colorMode
}

export const useAppIsDarkMode = () => useAppColorMode() === 'dark'
