import React from 'react';
import { Flame } from 'lucide-react';

export default function StreakCard({ days = 7, variant = 'solid' }) {
  const isGlass = variant === 'glass';

  return (
    <div className={`streak-card ${isGlass ? 'streak-card--glass' : 'streak-card--solid'}`}>
      <div className="streak-card__icon">
        <Flame size={22} fill="currentColor" />
      </div>
      <div>
        <div className="streak-card__days">{days} Days</div>
        <div className="streak-card__label">ACTIVE STREAK</div>
      </div>
    </div>
  );
}
