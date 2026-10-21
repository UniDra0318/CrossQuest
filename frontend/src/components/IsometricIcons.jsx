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

// 3D Isometric Purple Triangular Prism / Play (Step 01: Join with a PIN)
export function IsometricPrismPlay3D({ size = 56, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="prismTop" x1="16" y1="12" x2="48" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c084fc" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="prismLeft" x1="12" y1="28" x2="32" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7e22ce" />
          <stop offset="1" stopColor="#581c87" />
        </linearGradient>
        <linearGradient id="prismRight" x1="32" y1="28" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9333ea" />
          <stop offset="1" stopColor="#6b21a8" />
        </linearGradient>
        <filter id="prismGlow" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#3b0764" floodOpacity="0.35" />
        </filter>
      </defs>
      <g filter="url(#prismGlow)">
        {/* Play Prism Geometry */}
        <polygon points="32,10 54,24 32,36 10,24" fill="url(#prismTop)" />
        <polygon points="10,24 32,36 32,54 10,42" fill="url(#prismLeft)" />
        <polygon points="32,36 54,24 54,42 32,54" fill="url(#prismRight)" />
        {/* Play Icon Glyphs on Top Face */}
        <polygon points="30,20 37,24 30,28" fill="#ffffff" fillOpacity="0.9" />
      </g>
    </svg>
  );
}

// 3D Isometric Orange Cube / Diamond (Step 02: Play the scenario)
export function IsometricDiamond3D({ size = 56, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="diaTop" x1="16" y1="12" x2="48" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fdba74" />
          <stop offset="1" stopColor="#fb923c" />
        </linearGradient>
        <linearGradient id="diaLeft" x1="12" y1="28" x2="32" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ea580c" />
          <stop offset="1" stopColor="#c2410c" />
        </linearGradient>
        <linearGradient id="diaRight" x1="32" y1="28" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f97316" />
          <stop offset="1" stopColor="#9a3412" />
        </linearGradient>
        <filter id="diaGlow" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#7c2d12" floodOpacity="0.35" />
        </filter>
      </defs>
      <g filter="url(#diaGlow)">
        <polygon points="32,10 52,22 32,34 12,22" fill="url(#diaTop)" />
        <polygon points="12,22 32,34 32,54 12,42" fill="url(#diaLeft)" />
        <polygon points="32,34 52,22 52,42 32,54" fill="url(#diaRight)" />
        {/* Lightning glyph on top face */}
        <path d="M33 16 L29 23 H33 L31 28 L37 21 H33 Z" fill="#ffffff" fillOpacity="0.9" />
      </g>
    </svg>
  );
}

// 3D Isometric Yellow Ribbon / Medal (Step 03: Earn, streak, climb)
export function IsometricMedal3D({ size = 56, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="goldCoin" x1="20" y1="12" x2="44" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fef08a" />
          <stop offset="0.6" stopColor="#facc15" />
          <stop offset="1" stopColor="#ca8a04" />
        </linearGradient>
        <linearGradient id="ribbonLeft" x1="22" y1="32" x2="16" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f97316" />
          <stop offset="1" stopColor="#c2410c" />
        </linearGradient>
        <linearGradient id="ribbonRight" x1="42" y1="32" x2="48" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ea580c" />
          <stop offset="1" stopColor="#9a3412" />
        </linearGradient>
        <filter id="medalGlow" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#854d0e" floodOpacity="0.3" />
        </filter>
      </defs>
      <g filter="url(#medalGlow)">
        {/* Ribbons */}
        <polygon points="26,30 18,52 26,48 30,52 28,32" fill="url(#ribbonLeft)" />
        <polygon points="38,30 46,52 38,48 34,52 36,32" fill="url(#ribbonRight)" />
        {/* 3D Coin Badge */}
        <ellipse cx="32" cy="24" rx="16" ry="14" fill="#a16207" />
        <ellipse cx="32" cy="22" rx="16" ry="14" fill="url(#goldCoin)" />
        <ellipse cx="32" cy="22" rx="12" ry="10.5" stroke="#fef9c3" strokeWidth="1.5" />
        {/* Star */}
        <polygon points="32,16 34,20 38.5,21 35,24 36,28.5 32,26 28,28.5 29,24 25.5,21 30,20" fill="#ffffff" />
      </g>
    </svg>
  );
}

// 3D Isometric Blue INFOSEC Blueprint Box
export function IsometricInfosecBox3D({ size = 80, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="boxBlueTop" x1="20" y1="16" x2="60" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60a5fa" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="boxBlueLeft" x1="16" y1="36" x2="40" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="boxBlueRight" x1="40" y1="36" x2="64" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <filter id="boxGlow" x="0" y="0" width="80" height="80" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#172554" floodOpacity="0.5" />
        </filter>
      </defs>
      <g filter="url(#boxGlow)">
        {/* Top Face */}
        <polygon points="40,14 66,28 40,42 14,28" fill="url(#boxBlueTop)" />
        <polygon points="40,14 66,28 40,42 14,28" stroke="#93c5fd" strokeWidth="1" strokeOpacity="0.7" />
        {/* Left Face */}
        <polygon points="14,28 40,42 40,68 14,54" fill="url(#boxBlueLeft)" />
        {/* Right Face */}
        <polygon points="40,42 66,28 66,54 40,68" fill="url(#boxBlueRight)" />
        {/* Orange Warning Tape Accent on Top Edge */}
        <polygon points="40,14 50,19.5 44,22.8 34,17.3" fill="#ff6a00" />
        <polygon points="56,22.7 66,28 60,31.3 50,26" fill="#ff6a00" />
        {/* Text 'INFOSEC' in white on right facet */}
        <text 
          x="53" 
          y="50" 
          fill="#ffffff" 
          fontSize="7" 
          fontWeight="900" 
          fontFamily="monospace" 
          letterSpacing="0.08em" 
          transform="rotate(-26 53 50)" 
          textAnchor="middle" 
          fillOpacity="0.9"
        >
          INFOSEC
        </text>
        {/* Corner Viewfinder Markers */}
        <path d="M 8 16 H 12 V 20" stroke="#60a5fa" strokeWidth="1.5" />
        <path d="M 72 16 H 68 V 20" stroke="#60a5fa" strokeWidth="1.5" />
        <path d="M 8 72 H 12 V 68" stroke="#60a5fa" strokeWidth="1.5" />
        <path d="M 72 72 H 68 V 68" stroke="#60a5fa" strokeWidth="1.5" />
      </g>
    </svg>
  );
}
