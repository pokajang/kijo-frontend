const allowedTags = new Set([
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'UL',
  'OL',
  'LI',
  'TABLE',
  'THEAD',
  'TBODY',
  'TR',
  'TH',
  'TD',
  'DIV',
  'SPAN',
  'SMALL',
  'H5',
  'H6',
])

const allowedAttributes = new Set(['class', 'rowspan', 'colspan', 'type'])
const removedTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'])
const preservedClassNames = new Set(['table-responsive', 'table', 'table-bordered', 'table-sm'])
const titleCaseSmallWords = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'from',
  'in',
  'into',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
])

const normalizeText = (value) => String(value || '').trim()

const unwrapNode = (node) => {
  const parent = node.parentNode
  if (!parent) {
    return
  }

  while (node.firstChild) {
    parent.insertBefore(node.firstChild, node)
  }
  parent.removeChild(node)
}

const replaceElementTag = (element, tagName) => {
  const replacement = element.ownerDocument.createElement(tagName)
  replacement.innerHTML = element.innerHTML
  element.replaceWith(replacement)

  return replacement
}

const shouldUnwrapDecorativeElement = (element) => {
  const classes = Array.from(element.classList || [])

  return classes.some(
    (className) =>
      className === 'card' ||
      className === 'card-body' ||
      className === 'row' ||
      className === 'col-auto' ||
      className.startsWith('col-'),
  )
}

const isAllCapsHeading = (value) => {
  const letters = value.replace(/[^a-z]/gi, '')

  return letters.length > 1 && letters === letters.toUpperCase()
}

const toTitleCaseHeading = (value) => {
  const words = value.toLowerCase().split(/(\s+|-|\/)/)
  const meaningfulWords = words.filter((word) => /[a-z0-9]/i.test(word))
  const lastMeaningfulIndex = meaningfulWords.length - 1
  let meaningfulIndex = -1

  return words
    .map((word) => {
      if (!/[a-z0-9]/i.test(word)) {
        return word
      }

      meaningfulIndex += 1

      if (
        meaningfulIndex > 0 &&
        meaningfulIndex < lastMeaningfulIndex &&
        titleCaseSmallWords.has(word)
      ) {
        return word
      }

      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join('')
}

const normalizeHeadingText = (root) => {
  for (const heading of Array.from(root.querySelectorAll('h6'))) {
    const text = heading.textContent.trim()

    if (isAllCapsHeading(text)) {
      heading.textContent = toTitleCaseHeading(text)
    }
  }
}

const normalizeDocumentStructure = (root) => {
  for (const header of Array.from(root.querySelectorAll('.card-header'))) {
    replaceElementTag(header, 'h6')
  }

  for (const heading of Array.from(root.querySelectorAll('h5'))) {
    replaceElementTag(heading, 'h6')
  }

  for (const paragraph of Array.from(root.querySelectorAll('p'))) {
    if (paragraph.textContent.trim() === 'Travel Vehicle Priority') {
      const replacement = paragraph.ownerDocument.createElement('h6')
      replacement.textContent = paragraph.textContent.trim()
      paragraph.replaceWith(replacement)
    }
  }

  let hasUnwrapped = true
  while (hasUnwrapped) {
    hasUnwrapped = false

    for (const element of Array.from(root.querySelectorAll('*'))) {
      if (shouldUnwrapDecorativeElement(element)) {
        unwrapNode(element)
        hasUnwrapped = true
      }
    }
  }

  for (const element of Array.from(root.querySelectorAll('[class]'))) {
    const classNames = Array.from(element.classList).filter((className) =>
      preservedClassNames.has(className),
    )

    if (classNames.length > 0) {
      element.setAttribute('class', classNames.join(' '))
    } else {
      element.removeAttribute('class')
    }
  }

  normalizeHeadingText(root)
}

const normalizeElement = (element) => {
  if (removedTags.has(element.tagName)) {
    element.remove()
    return
  }

  if (!allowedTags.has(element.tagName)) {
    unwrapNode(element)
    return
  }

  if (element.tagName === 'B') {
    const replacement = element.ownerDocument.createElement('strong')
    replacement.innerHTML = element.innerHTML
    element.replaceWith(replacement)
    normalizeElement(replacement)
    return
  }

  if (element.tagName === 'I') {
    const replacement = element.ownerDocument.createElement('em')
    replacement.innerHTML = element.innerHTML
    element.replaceWith(replacement)
    normalizeElement(replacement)
    return
  }

  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase()
    const value = attribute.value || ''

    if (
      name.startsWith('on') ||
      name === 'style' ||
      !allowedAttributes.has(name) ||
      /^\s*javascript:/i.test(value)
    ) {
      element.removeAttribute(attribute.name)
    }
  }
}

export const normalizeHandbookHtml = (html) => {
  if (typeof DOMParser === 'undefined') {
    return normalizeText(html)
  }

  const document = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html')
  const root = document.body.firstElementChild

  normalizeDocumentStructure(root)

  for (const element of Array.from(root.querySelectorAll('*'))) {
    normalizeElement(element)
  }

  return root.innerHTML.trim()
}

const pdfBulletPattern = /^\s*[•◦▪‣]\s*(.*)$/

const appendInlineContent = (target, source) => {
  if (target.childNodes.length > 0) {
    target.append(source.ownerDocument.createTextNode(' '))
  }

  while (source.firstChild) {
    target.append(source.firstChild)
  }
}

// HR's PDF import preserves each visual PDF line as a paragraph. This formatter only
// changes the browser representation, leaving the versioned snapshot content unchanged.
export const formatHandbookDisplayHtml = (html) => {
  if (typeof DOMParser === 'undefined') {
    return normalizeHandbookHtml(html)
  }

  const document = new DOMParser().parseFromString(
    `<div>${normalizeHandbookHtml(html)}</div>`,
    'text/html',
  )
  const root = document.body.firstElementChild
  const formattedRoot = document.createElement('div')
  const nodes = Array.from(root.children)
  const isPdfLineImport = nodes.some((node) => {
    if (node.tagName !== 'P') {
      return false
    }

    const text = node.textContent.trim()
    return text === '' || pdfBulletPattern.test(text)
  })

  if (!isPdfLineImport) {
    return root.innerHTML.trim()
  }

  let paragraph = null
  let list = null
  let listItem = null

  const flushParagraph = () => {
    paragraph = null
  }

  const flushList = () => {
    list = null
    listItem = null
  }

  for (const [index, node] of nodes.entries()) {
    if (node.tagName !== 'P') {
      flushParagraph()
      flushList()
      formattedRoot.append(node)
      continue
    }

    const text = node.textContent.trim()
    if (text === '') {
      flushParagraph()
      flushList()
      continue
    }

    const bulletMatch = text.match(pdfBulletPattern)
    if (bulletMatch) {
      flushParagraph()
      if (!list) {
        list = document.createElement('ul')
        formattedRoot.append(list)
      }

      listItem = document.createElement('li')
      listItem.textContent = bulletMatch[1]
      list.append(listItem)
      continue
    }

    if (listItem) {
      appendInlineContent(listItem, node)
      continue
    }

    const nextText = nodes[index + 1]?.textContent.trim() || ''
    const introducesList = text.endsWith(':') && pdfBulletPattern.test(nextText)
    if (introducesList) {
      flushParagraph()
    }

    if (!paragraph) {
      paragraph = document.createElement('p')
      formattedRoot.append(paragraph)
    }
    appendInlineContent(paragraph, node)
    if (introducesList) {
      flushParagraph()
    }
  }

  return formattedRoot.innerHTML.trim()
}

export const normalizeHandbookContent = (content) => ({
  title: normalizeText(content?.title) || 'AMIOSH Employee Handbook',
  chapters: Array.isArray(content?.chapters)
    ? content.chapters
        .map((chapter, index) => ({
          id: normalizeText(chapter?.id) || `chapter-${index + 1}`,
          title: normalizeText(chapter?.title),
          bodyHtml: normalizeHandbookHtml(chapter?.bodyHtml),
        }))
        .filter((chapter) => chapter.title !== '' && chapter.bodyHtml !== '')
    : [],
})
