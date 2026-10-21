import React from 'react';
import { Check, Lock, Trophy, Zap } from 'lucide-react';
import { MAP_WIDTH, MAP_HEIGHT, MAP_PATH, MAP_PROGRESS, MAP_STOPS } from '../data/mapStops';
import '../styles/qmap.css';

export default function QuestMap({ stops = MAP_STOPS, progress = MAP_PROGRESS }) {
  return (
    <div className="qmap" style={{ width: '100%', maxWidth: `${MAP_WIDTH}px`, height: `${MAP_HEIGHT}px` }}>
      {/* 3D Perspective Grid Floor */}
      <div className="qmap__floor" />

      {/* SVG Connecting Path */}
      <svg
        className="qmap__svg"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        width="100%"
        height="100%"
        fill="none"
      >
        {/* Glow backdrop */}
        <path
          d={MAP_PATH}
          stroke="rgba(255, 122, 26, 0.25)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Full track background */}
        <path
          d={MAP_PATH}
          stroke="rgba(196, 181, 253, 0.35)"
          strokeWidth="4"
          strokeDasharray="6 6"
          strokeLinecap="round"
        />
        {/* Lit up completed progress path */}
        <path
          d={MAP_PATH}
          stroke="var(--cq-orange)"
          strokeWidth="5"
          strokeDasharray="1400"
          strokeDashoffset={1400 - (1400 * progress) / 100}
          strokeLinecap="round"
        />
      </svg>

      {/* Nodes and Labels */}
      <ul className="qmap__list">
        {stops.map((stop) => {
          const isDone = stop.status === 'done';
          const isCurrent = stop.status === 'current';
          const isLocked = stop.status === 'locked';

          return (
            <li key={stop.id}>
              {/* Node Circle */}
              <div
                className={`qnode ${isDone ? 'qnode--done' : ''} ${isCurrent ? 'qnode--current' : ''} ${isLocked ? 'qnode--locked' : ''} ${stop.goal ? 'qnode--goal' : ''}`}
                style={{
                  left: `${stop.x}px`,
                  top: `${stop.y}px`,
                  width: isCurrent ? '46px' : '40px',
                  height: isCurrent ? '46px' : '40px',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {isDone && <Check size={20} strokeWidth={3} />}
                {isCurrent && <Zap size={22} fill="currentColor" />}
                {isLocked && (stop.goal ? <Trophy size={18} /> : <Lock size={16} />)}
              </div>

              {/* "YOU ARE HERE" Bubble */}
              {isCurrent && (
                <div
                  className="qmap__here"
                  style={{
                    left: `${stop.x}px`,
                    top: `${stop.y - 48}px`,
                  }}
                >
                  YOU ARE HERE
                </div>
              )}

              {/* Node Label Below */}
              <div
                className={`qmap__label ${isCurrent ? 'qmap__label--current' : ''} ${isLocked ? 'qmap__label--locked' : ''}`}
                style={{
                  left: `${stop.x}px`,
                  top: `${stop.y + 28}px`,
                  transform: 'translateX(-50%)',
                }}
              >
                <strong>{stop.title}</strong>
                <small>{stop.note}</small>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
