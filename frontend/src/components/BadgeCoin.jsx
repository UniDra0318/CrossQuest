import React from 'react';
import { Star, Shield, Flame, Zap } from 'lucide-react';

export default function BadgeCoin({ badge, size = 'default' }) {
  const isSm = size === 'sm';
  const iconSize = isSm ? 26 : 32;

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
      default:
        return <Star size={iconSize} fill="currentColor" />;
    }
  };

  return (
    <div
      className={`coin ${isSm ? 'coin--sm' : ''}`}
      style={{
        '--hi': badge.hi,
        '--lo': badge.lo,
        '--rim': badge.rim,
        '--fg': badge.fg,
      }}
    >
      {renderIcon(badge.icon)}
    </div>
  );
}
