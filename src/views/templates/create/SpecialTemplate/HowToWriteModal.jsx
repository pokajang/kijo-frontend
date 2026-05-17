// src/templates/create/SpecialTemplate/HowToWriteModal.jsx
import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CCard,
  CCardHeader,
  CCardBody,
} from '@coreui/react'

/**
 * Modal with enhanced guidance on writing the proposal content.
 */
export default function HowToWriteModal({ visible, onClose }) {
  return (
    <CModal visible={visible} onClose={onClose} size="lg" alignment="center" scrollable>
      <CModalHeader closeButton>
        <CModalTitle>How to Write Proposal Contents</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CCard className="mb-3">
          <CCardHeader>
            <strong>General Information</strong>
          </CCardHeader>
          <CCardBody>
            <p>
              The editor works like a mini word processor. Click <em>Format</em> in the toolbar to
              reveal styles such as headings, paragraphs, lists, and preformatted text. Use bold,
              italics, and underline for emphasis, and the align options to adjust text flow.
            </p>
            <ul>
              <li>
                <strong>Headings:</strong> Organize sections with H1–H6 to create a clear hierarchy.
              </li>
              <li>
                <strong>Lists:</strong> Use bullet or numbered lists for steps, features, or
                deliverables.
              </li>
              <li>
                <strong>Links & Tables:</strong> Insert hyperlinks or small tables for detailed
                data.
              </li>
            </ul>
          </CCardBody>
          <CCardHeader>
            <strong>Proposal Outline</strong>
          </CCardHeader>
          <CCardBody>
            <p>
              Here’s a recommended structure for your proposal. Copy these headings and replace the
              example text:
            </p>
            <ol>
              <li>
                <strong>Introduction</strong> - Provide a brief overview of the client’s needs and
                your solution.
              </li>
              <li>
                <strong>Objectives</strong> - List the goals you intend to achieve.
              </li>
              <li>
                <strong>Scope of Work</strong> - Detail the tasks, deliverables, and boundaries.
              </li>
              <li>
                <strong>Methodology</strong> - Explain your approach, tools, and techniques.
              </li>
              <li>
                <strong>Timeline</strong> - Outline milestones and estimated completion dates.
              </li>
              <li>
                <strong>Deliverables</strong> - Specify final outputs and formats.
              </li>
              <li>
                <strong>Terms & Conditions</strong> - State pricing, payment terms, and any
                assumptions.
              </li>
            </ol>
          </CCardBody>
          <CCardHeader>
            <strong>Example Markup</strong>
          </CCardHeader>
          <CCardBody>
            <p>
              Use the editor’s <em>«</em> formatselect <em>»</em> menu to choose headings:
            </p>
            <pre>
              {`<h2>Introduction</h2>
<p>We propose to deliver a comprehensive audit based on your requirements.</p>

<h3>Objectives</h3>
<ul>
  <li>Identify key risks</li>
  <li>Recommend mitigation measures</li>
</ul>`}
            </pre>
            <p>
              Copy and paste this sample into the “&lt;&gt;” editor, then modify the text to suit
              your project.
            </p>
          </CCardBody>
        </CCard>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}
