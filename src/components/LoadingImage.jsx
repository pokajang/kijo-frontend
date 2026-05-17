import React, { useEffect, useState } from 'react'
import { CSpinner } from '@coreui/react'

const LoadingImage = ({
  src,
  alt,
  className = '',
  style,
  wrapperClassName = '',
  placeholderStyle,
  loadingLabel = 'Loading image...',
  errorLabel = 'Unable to load image.',
  onLoad,
  onError,
  ...imageProps
}) => {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setFailed(false)
  }, [src])

  if (!src) return null

  return (
    <div className={wrapperClassName} style={{ position: 'relative' }}>
      {!loaded && (
        <div
          className="border rounded bg-light text-muted d-flex align-items-center justify-content-center"
          style={{
            minHeight: 160,
            width: '100%',
            ...placeholderStyle,
          }}
        >
          {failed ? (
            <span className="small">{errorLabel}</span>
          ) : (
            <span className="small d-inline-flex align-items-center gap-2">
              <CSpinner size="sm" />
              {loadingLabel}
            </span>
          )}
        </div>
      )}
      {!failed && (
        <img
          src={src}
          alt={alt}
          className={className}
          style={{
            ...style,
            display: loaded ? style?.display : 'none',
          }}
          onLoad={(event) => {
            setLoaded(true)
            onLoad?.(event)
          }}
          onError={(event) => {
            setFailed(true)
            onError?.(event)
          }}
          {...imageProps}
        />
      )}
    </div>
  )
}

export default LoadingImage
