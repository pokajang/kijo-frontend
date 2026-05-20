import React, { useMemo } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import { useAppIsDarkMode } from '../../utils/themeMode'

const tinyMceDarkContentStyle = `
  body {
    background: #1c1f23;
    color: #ced4da;
  }
  a {
    color: #7aabf0;
  }
  table,
  td,
  th {
    border-color: #373d45;
  }
  blockquote {
    border-color: #373d45;
    color: #9aa5b4;
  }
`

const tinyMceLightContentStyle = `
  body {
    background: #ffffff;
    color: #1f2937;
  }
`

export const getTinyMceThemedInit = (init = {}, isDarkMode = false) => ({
  ...init,
  skin: isDarkMode ? 'oxide-dark' : 'oxide',
  content_css: isDarkMode ? 'dark' : 'default',
  content_style: [
    isDarkMode ? tinyMceDarkContentStyle : tinyMceLightContentStyle,
    init.content_style,
  ]
    .filter(Boolean)
    .join('\n'),
})

const ThemedTinyMCEEditor = ({ init, ...props }) => {
  const isDarkMode = useAppIsDarkMode()
  const themedInit = useMemo(() => getTinyMceThemedInit(init, isDarkMode), [init, isDarkMode])

  return (
    <Editor
      key={isDarkMode ? 'tinymce-dark' : 'tinymce-light'}
      tinymceScriptSrc="/tinymce/tinymce.min.js"
      {...props}
      init={themedInit}
    />
  )
}

export default ThemedTinyMCEEditor
