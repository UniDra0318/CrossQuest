import React from 'react';

// 3D Isometric Blue Cube (Information Security)
export function IsometricCube3D({ size = 48, className = '' }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="cubeTop" x1="16" y1="12" x2="48" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#93c5fd" />
          <stop offset="1" stopColor="#60a5fa" />
        </linearGradient>
        <linearGradient id="cubeLeft" x1="12" y1="28" x2="32" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="cubeRight" x1="32" y1="28" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
        <filter id="cubeGlow" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1e3a8a" floodOpacity="0.3" />
        </filter>
      </defs>
      <g filter="url(#cubeGlow)">
        {/* Top Face */}
        <polygon points="32,8 52,20 32,32 12,20" fill="url(#cubeTop)" />
        {/* Left Face */}
        <polygon points="12,20 32,32 32,54 12,42" fill="url(#cubeLeft)" />
        {/* Right Face */}
        <polygon points="32,32 52,20 52,42 32,54" fill="url(#cubeRight)" />
        {/* Subtle Edge Highlights */}
        <line x1="32" y1="8" x2="52" y2="20" stroke="#dbeafe" strokeWidth="1" strokeOpacity="0.8" />
        <line x1="32" y1="8" x2="12" y2="20" stroke="#dbeafe" strokeWidth="1" strokeOpacity="0.8" />
        <line x1="32" y1="8" x2="32" y2="32" stroke="#dbeafe" strokeWidth="1" strokeOpacity="0.6" />
      </g>
    </svg>
  );
}

// 3D Isometric Green Cylinder / Padlock (Access Control)
export function IsometricLock3D({ size = 48, className = '' }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="lockShackle" x1="24" y1="8" x2="40" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e2e8f0" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="lockBody" x1="16" y1="24" x2="48" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop offset="0.6" stopColor="#059669" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <filter id="lockGlow" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#064e3b" floodOpacity="0.3" />
        </filter>
      </defs>
      <g filter="url(#lockGlow)">
        {/* Shackle */}
        <path 
          d="M24 24 V 16 C 24 11.5 27.5 8 32 8 C 36.5 8 40 11.5 40 16 V 24" 
          stroke="url(#lockShackle)" 
          strokeWidth="5" 
          strokeLinecap="round" 
        />
        {/* Body */}
        <rect x="18" y="24" width="28" height="28" rx="7" fill="url(#lockBody)" />
        {/* Keyhole */}
        <circle cx="32" cy="35" r="3" fill="#022c22" />
        <polygon points="30.5,35 33.5,35 34,44 30,44" fill="#022c22" />
        {/* Soft Highlight */}
        <path d="M22 28 H 42" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.8" />
      </g>
    </svg>
  );
}

// 3D Isometric Red Sphere / Seal (Privacy Management)
export function IsometricSphere3D({ size = 48, className = '' }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="sphereGrad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="35%" stopColor="#ef4444" />
          <stop offset="80%" stopColor="#b91c1c" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>
        <filter id="sphereGlow" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#450a0a" floodOpacity="0.3" />
        </filter>
      </defs>
      <g filter="url(#sphereGlow)">
        <circle cx="32" cy="32" r="22" fill="url(#sphereGrad)" />
        {/* Ambient Ring / 3D Torus Layer */}
        <ellipse cx="32" cy="32" rx="20" ry="8" stroke="#fecaca" strokeWidth="1.5" strokeOpacity="0.5" transform="rotate(-25 32 32)" />
        {/* Specular Highlight */}
        <ellipse cx="26" cy="22" rx="5" ry="3" fill="#ffffff" fillOpacity="0.6" transform="rotate(-25 26 22)" />
      </g>
    </svg>
  );
}

// 3D Isometric Purple Database / Cylinders (Database Security)
export function IsometricDatabase3D({ size = 48, className = '' }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="dbTop" x1="16" y1="12" x2="48" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="dbBody" x1="16" y1="16" x2="48" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#5b21b6" />
        </linearGradient>
        <filter id="dbGlow" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#2e1065" floodOpacity="0.3" />
        </filter>
      </defs>
      <g filter="url(#dbGlow)">
        {/* Bottom Cylinder */}
        <path d="M16 38 C 16 33 48 33 48 38 V 46 C 48 51 16 51 16 46 Z" fill="url(#dbBody)" />
        <ellipse cx="32" cy="38" rx="16" ry="6" fill="#7c3aed" />

        {/* Middle Cylinder */}
        <path d="M16 26 C 16 21 48 21 48 26 V 34 C 48 39 16 39 16 34 Z" fill="url(#dbBody)" />
        <ellipse cx="32" cy="26" rx="16" ry="6" fill="#8b5cf6" />

        {/* Top Cylinder */}
        <path d="M16 14 C 16 9 48 9 48 14 V 22 C 48 27 16 27 16 22 Z" fill="url(#dbBody)" />
        <ellipse cx="32" cy="14" rx="16" ry="6" fill="url(#dbTop)" />

        {/* Subtle LED activity dots */}
        <circle cx="24" cy="46" r="1.5" fill="#a7f3d0" />
        <circle cx="28" cy="46" r="1.5" fill="#fde047" />
        <circle cx="24" cy="34" r="1.5" fill="#a7f3d0" />
      </g>
    </svg>
  );
}
