import React from 'react';
import { CUBE_FACES } from '../data/tracks';

/**
 * Pure CSS 3D Spinning Cube widget.
 * Animates on a 3D gimbal (cq-spin) showing track faces and rewards.
 */
export default function SpinCube({ size = 96, faces = CUBE_FACES }) {
  // Ensure we have exactly 6 faces
  const displayFaces = faces.slice(0, 6);

  return (
    <div className="spin-cube" style={{ '--s': `${size}px` }}>
      {displayFaces.map((f, i) => (
        <div
          key={i}
          className={`spin-cube__face spin-cube__face--${i + 1}`}
          style={{
            backgroundColor: f.bg || '#1d6fe0',
            color: f.fg || '#ffffff',
            fontSize: `${size * 0.16}px`,
          }}
        >
          {f.label}
        </div>
      ))}
    </div>
  );
}
