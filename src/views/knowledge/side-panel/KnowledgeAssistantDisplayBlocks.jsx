import React from 'react'

const stringValue = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

const clampPercent = (value, max) => {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0
  return Math.max(4, Math.min(100, Math.round((value / max) * 100)))
}

const MetricCardsBlock = ({ block }) => {
  const items = Array.isArray(block.items) ? block.items : []
  if (items.length === 0) return null

  return (
    <section className="knowledge-assistant-display-block" aria-label={stringValue(block.title)}>
      {block.title ? <div className="knowledge-assistant-display-title">{block.title}</div> : null}
      <div className="knowledge-assistant-metric-cards">
        {items.slice(0, 6).map((item, index) => (
          <div
            className="knowledge-assistant-metric-card"
            key={`${item?.label || 'metric'}-${index}`}
          >
            <span className="knowledge-assistant-metric-label">{stringValue(item?.label)}</span>
            <strong className="knowledge-assistant-metric-value">{stringValue(item?.value)}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

const TableBlock = ({ block }) => {
  const columns = Array.isArray(block.columns) ? block.columns.map(stringValue).filter(Boolean) : []
  const rows = Array.isArray(block.rows) ? block.rows : []
  if (columns.length === 0 || rows.length === 0) return null

  return (
    <section className="knowledge-assistant-display-block" aria-label={stringValue(block.title)}>
      {block.title ? <div className="knowledge-assistant-display-title">{block.title}</div> : null}
      <div className="knowledge-assistant-table-wrap">
        <table className="knowledge-assistant-display-table">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th key={`${column}-${index}`} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 8).map((row, rowIndex) => {
              const cells = Array.isArray(row) ? row : []
              return (
                <tr key={`row-${rowIndex}`}>
                  {columns.map((_, cellIndex) => (
                    <td key={`cell-${rowIndex}-${cellIndex}`}>{stringValue(cells[cellIndex])}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {rows.length > 8 ? (
        <div className="knowledge-assistant-display-more">and {rows.length - 8} more</div>
      ) : null}
    </section>
  )
}

const BarChartBlock = ({ block }) => {
  const labels = Array.isArray(block.labels) ? block.labels.map(stringValue) : []
  const values = Array.isArray(block.values) ? block.values.map((value) => Number(value) || 0) : []
  const displayValues = Array.isArray(block.display_values)
    ? block.display_values.map(stringValue)
    : []
  const rows = labels
    .map((label, index) => ({
      label,
      value: values[index] ?? 0,
      displayValue: displayValues[index] || stringValue(values[index] ?? 0),
    }))
    .filter((item) => item.label !== '')
    .slice(0, 12)
  if (rows.length === 0) return null

  const max = Math.max(...rows.map((item) => item.value), 0)

  return (
    <section className="knowledge-assistant-display-block" aria-label={stringValue(block.title)}>
      {block.title ? <div className="knowledge-assistant-display-title">{block.title}</div> : null}
      <div className="knowledge-assistant-bar-chart">
        {rows.map((item) => (
          <div className="knowledge-assistant-bar-row" key={item.label}>
            <span className="knowledge-assistant-bar-label">{item.label}</span>
            <span className="knowledge-assistant-bar-track">
              <span
                className="knowledge-assistant-bar-fill"
                style={{ width: `${clampPercent(item.value, max)}%` }}
              />
            </span>
            <strong className="knowledge-assistant-bar-value">{item.displayValue}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

const NoteBlock = ({ block }) => {
  const content = stringValue(block.content)
  if (!content) return null

  return (
    <div className="knowledge-assistant-display-note" data-tone={stringValue(block.tone) || 'info'}>
      {content}
    </div>
  )
}

const KnowledgeAssistantDisplayBlocks = ({ blocks }) => {
  const safeBlocks = Array.isArray(blocks) ? blocks : []
  if (safeBlocks.length === 0) return null

  return (
    <div className="knowledge-assistant-display-blocks">
      {safeBlocks.map((block, index) => {
        const type = stringValue(block?.type)
        if (type === 'metric_cards') {
          return <MetricCardsBlock block={block} key={`${type}-${index}`} />
        }
        if (type === 'table') return <TableBlock block={block} key={`${type}-${index}`} />
        if (type === 'bar_chart') return <BarChartBlock block={block} key={`${type}-${index}`} />
        if (type === 'note') return <NoteBlock block={block} key={`${type}-${index}`} />
        return null
      })}
    </div>
  )
}

export default KnowledgeAssistantDisplayBlocks
