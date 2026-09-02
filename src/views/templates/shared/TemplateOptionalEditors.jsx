import React from 'react'
import { CAccordion, CAccordionBody, CAccordionHeader, CAccordionItem } from '@coreui/react'
import EditorInput from '../components/EditorInput'
import { hasRichText } from './templateValidation'

const TemplateOptionalEditors = ({ items, onChange }) => {
  return (
    <div className="mb-3">
      <div className="small text-muted mb-2">Additional sections — Optional</div>
      {items.map((item) => (
        <CAccordion
          key={`${item.field}-${item.invalid ? 'invalid' : 'valid'}`}
          activeItemKey={hasRichText(item.value) || item.invalid ? item.field : undefined}
          className="mb-2"
        >
          <CAccordionItem key={item.field} itemKey={item.field}>
            <CAccordionHeader>{item.label}</CAccordionHeader>
            <CAccordionBody>
              <EditorInput
                label={null}
                field={item.field}
                value={item.value}
                onChange={onChange}
                invalid={item.invalid}
                feedbackInvalid={item.feedbackInvalid}
              />
            </CAccordionBody>
          </CAccordionItem>
        </CAccordion>
      ))}
    </div>
  )
}

export default TemplateOptionalEditors
