import React from 'react'
import WhatsNewForm from './whats-new/WhatsNewForm'
import WhatsNewDetail from './whats-new/WhatsNewDetail'
import WhatsNewRecords from './whats-new/WhatsNewRecords'

const WhatsNewAdmin = ({ mode = 'records' }) => {
  if (mode === 'create' || mode === 'edit') {
    return <WhatsNewForm mode={mode} />
  }

  if (mode === 'detail') {
    return <WhatsNewDetail />
  }

  return <WhatsNewRecords />
}

export default WhatsNewAdmin
