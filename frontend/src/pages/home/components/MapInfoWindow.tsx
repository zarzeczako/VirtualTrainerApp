import type { CSSProperties, ReactNode } from 'react'
import { OverlayView } from '@react-google-maps/api'

interface MapInfoWindowProps {
  position: google.maps.LatLngLiteral
  onClose: () => void
  children: ReactNode
  zIndex?: number
  className?: string
  style?: CSSProperties
  media?: ReactNode
}

export default function MapInfoWindow({
  position,
  onClose,
  children,
  zIndex = 10,
  className,
  style,
  media,
}: MapInfoWindowProps) {
  return (
    <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} zIndex={zIndex}>
      <div className={`wt-map-info-window${className ? ` ${className}` : ''}`} style={style}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij"
          className="wt-map-info-window__close"
        >
          ×
        </button>
        {media}
        <div className="wt-map-info-window__content">{children}</div>
        <span className="wt-map-info-window__arrow" />
      </div>
    </OverlayView>
  )
}
