import React from 'react'

export const formatAssistantMessageContent = (content) =>
  String(content ?? '').replace(/\r\n|\n|\r/g, '\n')

const assistantListLinePattern = /^\s*(?:(\d+)[.)]|[-*])\s+(.+)$/

const normalizeAssistantSourceTitle = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

export const removeRedundantSourceTitleLines = (content, sources) => {
  const sourceTitles = new Set(
    (Array.isArray(sources) ? sources : [])
      .map((source) => normalizeAssistantSourceTitle(source?.title))
      .filter(Boolean),
  )

  if (sourceTitles.size === 0) return content

  const lines = formatAssistantMessageContent(content).split('\n')
  let removedAny = false
  const filteredLines = lines.filter((line) => {
    const match = line.match(assistantListLinePattern)
    if (!match) return true

    const itemText = normalizeAssistantSourceTitle(match[2])
    const isDuplicateSourceTitle = sourceTitles.has(itemText)
    if (isDuplicateSourceTitle) removedAny = true
    return !isDuplicateSourceTitle
  })

  return removedAny ? filteredLines.join('\n').trim() : content
}

export const assistantMessagesAreNearLatest = (element) =>
  element.scrollHeight - element.scrollTop - element.clientHeight <= 56

const cleanLegacyRouteText = (value) =>
  String(value || '')
    .replace(/\s*\(related route:\s*\/[A-Za-z0-9_\-/?=&%.#]+\)/gi, '')
    .replace(/\s+([.,;:])/g, '$1')

export const assistantMessageCopyText = (content) =>
  cleanLegacyRouteText(formatAssistantMessageContent(content))
    .replace(/\[\[kijo-route:[A-Za-z0-9_-]+\|([^\]\r\n]{1,120})\]\]/g, '$1')
    .trim()

const renderTextWithInlineRoutes = (text, routeRefs, onOpenRouteRef) => {
  const cleaned = cleanLegacyRouteText(text)
  const parts = []
  const tokenPattern = /\[\[kijo-route:([A-Za-z0-9_-]+)\|([^\]\r\n]{1,120})\]\]/g
  let lastIndex = 0
  let match

  while ((match = tokenPattern.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      parts.push(cleaned.slice(lastIndex, match.index))
    }

    const routeRef = routeRefs.get(match[1])
    if (routeRef) {
      parts.push(
        <button
          key={`${match[1]}-${match.index}`}
          type="button"
          className="knowledge-assistant-inline-route"
          onClick={() => onOpenRouteRef(routeRef)}
        >
          {routeRef.label || match[2]}
        </button>,
      )
    } else {
      parts.push(match[2])
    }

    lastIndex = tokenPattern.lastIndex
  }

  if (lastIndex < cleaned.length) {
    parts.push(cleaned.slice(lastIndex))
  }

  return parts.length > 0 ? parts : cleaned
}

export const renderAssistantMessageContent = (
  content,
  trailingInline = null,
  { routeRefs = new Map(), onOpenRouteRef = () => {} } = {},
) => {
  const lines = formatAssistantMessageContent(content)
    .split('\n')
    .map((line) => line.trim())
  const blocks = []
  let paragraph = []
  let list = null

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') })
    paragraph = []
  }

  const flushList = () => {
    if (!list) return
    blocks.push(list)
    list = null
  }

  lines.forEach((line) => {
    if (!line) {
      flushParagraph()
      flushList()
      return
    }

    const match = line.match(assistantListLinePattern)
    if (match) {
      flushParagraph()
      const type = match[1] ? 'ordered-list' : 'unordered-list'
      if (!list || list.type !== type) {
        flushList()
        list = { type, items: [] }
      }
      list.items.push(match[2].trim())
      return
    }

    if (list && list.items.length > 0) {
      list.items[list.items.length - 1] = `${list.items[list.items.length - 1]} ${line}`
      return
    }

    paragraph.push(line)
  })

  flushParagraph()
  flushList()

  if (blocks.length === 0) {
    return trailingInline ? [<p key="assistant-feedback">{trailingInline}</p>] : []
  }

  return blocks.map((block, index) => {
    const isLastBlock = index === blocks.length - 1

    if (block.type === 'ordered-list') {
      return (
        <ol key={index}>
          {block.items.map((item, itemIndex) => {
            const isLastItem = itemIndex === block.items.length - 1
            return (
              <li key={itemIndex}>
                {renderTextWithInlineRoutes(item, routeRefs, onOpenRouteRef)}
                {isLastBlock && isLastItem && trailingInline ? <> {trailingInline}</> : null}
              </li>
            )
          })}
        </ol>
      )
    }

    if (block.type === 'unordered-list') {
      return (
        <ul key={index}>
          {block.items.map((item, itemIndex) => {
            const isLastItem = itemIndex === block.items.length - 1
            return (
              <li key={itemIndex}>
                {renderTextWithInlineRoutes(item, routeRefs, onOpenRouteRef)}
                {isLastBlock && isLastItem && trailingInline ? <> {trailingInline}</> : null}
              </li>
            )
          })}
        </ul>
      )
    }

    return (
      <p key={index}>
        {renderTextWithInlineRoutes(block.text, routeRefs, onOpenRouteRef)}
        {isLastBlock && trailingInline ? <> {trailingInline}</> : null}
      </p>
    )
  })
}
