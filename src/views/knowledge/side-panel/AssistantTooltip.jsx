import React from 'react'
import { CTooltip } from '@coreui/react'

const AssistantTooltip = ({ children, content, placement = 'top' }) => (
  <CTooltip content={content} placement={placement}>
    {children}
  </CTooltip>
)

export default AssistantTooltip
