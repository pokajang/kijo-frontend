import React from 'react'

const DataTableShell = ({ children, className = '' }) => (
  <div className={`data-table-shell records-table-shell ${className}`.trim()}>{children}</div>
)

const DataTableViewport = ({
  children,
  desktopBreakpoint = 'lg',
  tableViewportRef,
  tableViewportHeight,
  className = '',
  style,
}) => (
  <div
    className={`table-scroll-viewport d-none d-${desktopBreakpoint}-block ${className}`.trim()}
    ref={tableViewportRef}
    style={{
      maxHeight: tableViewportHeight ? `${tableViewportHeight}px` : 'none',
      overflowX: 'auto',
      overflowY: 'auto',
      borderTopLeftRadius: 'var(--app-radius-lg)',
      borderTopRightRadius: 'var(--app-radius-lg)',
      ...style,
    }}
  >
    {children}
  </div>
)

export default DataTableShell
export { DataTableViewport }
