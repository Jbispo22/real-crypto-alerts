import { useState, useEffect } from 'react'

export default function MobileTitleBar({ volume, onVolumeChange }) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)

  return (
    <>
      <header className="mobile-titlebar">
        <div className="mobile-titlebar-accent" />
        
        <div className="mobile-titlebar-content">
          <div className="mobile-brand">
            <span className="mobile-brand-icon">⚡</span>
            <span className="mobile-brand-text">Crypto Alerts</span>
          </div>

          <div className="mobile-volume-container">
            <button
              type="button"
              className="mobile-volume-btn"
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
              title="Controlar volume dos alertas"
            >
              <span className="mobile-volume-icon">
                {volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
              </span>
              <span className="mobile-volume-value">{volume}%</span>
            </button>

            {showVolumeSlider && (
              <div className="mobile-volume-slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => onVolumeChange(Number(e.target.value))}
                  className="mobile-volume-slider"
                />
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
