import React, { useState, useRef, useEffect } from 'react'
import { CContainer, CRow, CCol, CForm, CFormTextarea, CButton } from '@coreui/react'
import dummyResponses from './dummyResponse' // Import dummy responses

const HseRef = () => {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [chatStarted, setChatStarted] = useState(false)
  const messageEndRef = useRef(null)
  const inputRef = useRef(null) // Added ref for the textarea

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const userMessage = { role: 'user', text: inputText }
    if (!chatStarted) setChatStarted(true)
    setMessages((prev) => [...prev, userMessage])
    const userText = inputText
    setInputText('')

    // Reset the textarea height after submission
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    setTimeout(() => {
      // Randomly pick a response from dummyResponses
      const randomIndex = Math.floor(Math.random() * dummyResponses.length)
      const randomResponse = dummyResponses[randomIndex]
      setMessages((prev) => [...prev, { role: 'bot', text: randomResponse }])
    }, 600)
  }

  const handleReset = () => {
    window.location.reload()
  }

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  return (
    <CContainer
      fluid
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: 'calc(100vh - 150px)' }}
    >
      <CRow className="w-100">
        <CCol xs={12} sm={10} md={8} lg={6} className="mx-auto">
          <div className="d-flex flex-column" style={{ height: '100%' }}>
            {chatStarted && (
              <div
                className="flex-grow-1 overflow-auto p-3 app-surface-panel border rounded mb-3"
                style={{ maxHeight: '75vh' }}
              >
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`mb-2 ${msg.role === 'user' ? 'text-end' : 'text-start'}`}
                  >
                    <span
                      className={`d-inline-block px-3 py-2 rounded text-break ${
                        msg.role === 'user' ? 'bg-primary text-white' : 'bg-secondary text-white'
                      }`}
                      style={{ maxWidth: '75%' }}
                    >
                      {msg.text}
                    </span>
                  </div>
                ))}
                <div ref={messageEndRef} />
              </div>
            )}
            <CForm onSubmit={handleSubmit} className="d-flex gap-2 align-items-end">
              <CFormTextarea
                ref={inputRef} // Attach the ref here
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = `${e.target.scrollHeight}px`
                }}
                placeholder="Ask your HSE question..."
                rows={1}
                style={{
                  resize: 'none',
                  overflow: 'hidden',
                  lineHeight: '1.5',
                  maxHeight: '120px',
                  flex: 1,
                }}
              />
              <CButton type="submit" color="primary" style={{ height: '38px' }}>
                Send
              </CButton>
              {chatStarted && (
                <CButton
                  type="button"
                  color="danger"
                  onClick={handleReset}
                  style={{ height: '38px' }}
                >
                  Reset Chat
                </CButton>
              )}
            </CForm>
          </div>
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default HseRef
