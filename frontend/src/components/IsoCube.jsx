import React from 'react';

/**
 * Pure CSS 3D Isometric Icon Cube (3 visible shaded faces).
 */
export default function IsoCube({ size = 56, color, top, right, children, label }) {
  return (
    <div className="iso-scene">
      <div className="iso-float">
        <div className="iso" style={{ '--s': `${size}px` }}>
          <div className="iso__f iso__f--front" style={{ background: color, color: '#fff' }}>
            {children}
            {label && <span style={{ fontWeight: 800, fontSize: `${size * 0.22}px` }}>{label}</span>}
          </div>
          <div className="iso__f iso__f--right" style={{ background: right }} />
          <div className="iso__f iso__f--top" style={{ background: top }} />
        </div>
      </div>
    </div>
  );
}
