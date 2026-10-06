import React from 'react';

/**
 * Pure CSS 3D Quest Bot Mascot.
 * Respects transform-style: preserve-3d and keyframe animations from widgets.css.
 */
export default function Mascot({ className = '' }) {
  return (
    <div className={`qb ${className}`}>
      <div className="qb__float">
        <div className="qb__pedestal" />
        <div className="qb__head">
          <div className="qb__antenna" />
          <div className="qb__ball" />
          <div className="qb__back" />
          <div className="qb__mid" />
          <div className="qb__ear qb__ear--l" />
          <div className="qb__ear qb__ear--r" />
          <div className="qb__shell" />
          <div className="qb__glow" />
          <div className="qb__screen">
            <div className="qb__eye" />
            <div className="qb__eye" />
          </div>
        </div>
      </div>
    </div>
  );
}
