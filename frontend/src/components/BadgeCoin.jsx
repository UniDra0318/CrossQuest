import React from 'react';
import { Star, Shield, Flame, Zap, Award, Crown, Lock, Target, CheckCircle2 } from 'lucide-react';

export default function BadgeCoin({ badge, size = 'default' }) {
  const isSm = size === 'sm';
  const iconSize = isSm ? 26 : 34;

  const renderIcon = (iconName) => {
    switch (iconName) {
      case 'star':
        return <Star size={iconSize} fill="currentColor" />;
      case 'shield':
        return <Shield size={iconSize} fill="currentColor" />;
      case 'flame':
        return <Flame size={iconSize} fill="currentColor" />;
      case 'zap':
        return <Zap size={iconSize} fill="currentColor" />;
      case 'award':
      case 'medal':
        return <Award size={iconSize} fill="currentColor" />;
      case 'crown':
        return <Crown size={iconSize} fill="currentColor" />;
      case 'lock':
        return <Lock size={iconSize} fill="currentColor" />;
      case 'target':
        return <Target size={iconSize} fill="currentColor" />;
      case 'check':
        return <CheckCircle2 size={iconSize} fill="currentColor" />;
      default:
        return <Star size={iconSize} fill="currentColor" />;
    }
  };

  const tier = (badge?.tier || 'Adept').toLowerCase();

  // Vibrant, rich 3D metallic & gem palettes
  const tierPalettes = {
    legendary: { hi: '#ffe08a', lo: '#ff8a00', rim: '#b84f00', fg: '#17102b', icon: 'flame' },
    master: { hi: '#93c5fd', lo: '#2563eb', rim: '#1e40af', fg: '#ffffff', icon: 'shield' },
    adept: { hi: '#c084fc', lo: '#7c3aed', rim: '#5b21b6', fg: '#ffffff', icon: 'zap' },
    emerald: { hi: '#a7f3d0', lo: '#059669', rim: '#065f46', fg: '#ffffff', icon: 'award' },
    default: { hi: '#6ee7b7', lo: '#059669', rim: '#047857', fg: '#ffffff', icon: 'star' }
  };

  const palette = tierPalettes[tier] || tierPalettes.default;

  const hi = badge?.hi || palette.hi;
  const lo = badge?.lo || palette.lo;
  const rim = badge?.rim || palette.rim;
  const fg = badge?.fg || palette.fg;
  const icon = badge?.icon || palette.icon;

  return (
    <div
      className={`coin ${isSm ? 'coin--sm' : ''}`}
      style={{
        '--hi': hi,
        '--lo': lo,
        '--rim': rim,
        '--fg': fg,
      }}
    >
      {renderIcon(icon)}
    </div>
  );
}
