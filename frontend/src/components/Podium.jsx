import React from 'react';

export default function Podium({ top = [], small = false }) {
  // Find ranks
  const first = top.find((t) => t.rank === 1) || { name: '[Name]' };
  const second = top.find((t) => t.rank === 2) || { name: '[Name]' };
  const third = top.find((t) => t.rank === 3) || { name: '[Name]' };

  return (
    <div className={`podium ${small ? 'podium--sm' : ''}`}>
      {/* 2nd place */}
      <div className="podium__col podium__col--2">
        <div className="podium__name">{second.name}</div>
        <div className="podium__step">2</div>
      </div>

      {/* 1st place */}
      <div className="podium__col podium__col--1">
        <div className="podium__name">{first.name}</div>
        <div className="podium__step">1</div>
      </div>

      {/* 3rd place */}
      <div className="podium__col podium__col--3">
        <div className="podium__name">{third.name}</div>
        <div className="podium__step">3</div>
      </div>
    </div>
  );
}
