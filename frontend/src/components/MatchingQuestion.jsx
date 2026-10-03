import React, { useState, useEffect, useRef } from 'react';
import { Check, RotateCcw, ArrowRight, CheckCircle2, XCircle, Link2, Unlink } from 'lucide-react';

const PAIR_COLORS = [
  { stroke: '#772ce8', bg: '#f3e8ff', border: '#d8b4fe', text: '#6b21a8' },
  { stroke: '#06b6d4', bg: '#cffafe', border: '#a5f3fc', text: '#0e7490' },
  { stroke: '#f59e0b', bg: '#fef3c7', border: '#fde68a', text: '#b45309' },
  { stroke: '#ec4899', bg: '#fce7f3', border: '#fbcfe8', text: '#be185d' },
  { stroke: '#10b981', bg: '#d1fae5', border: '#a7f3d0', text: '#047857' }
];

export default function MatchingQuestion({ question, answeredState, onSubmitMatches }) {
  const containerRef = useRef(null);
  const leftRefs = useRef({});
  const rightRefs = useRef({});

  // Shuffled left and right items on question mount
  const [shuffledLeftItems, setShuffledLeftItems] = useState([]);
  const [shuffledRightItems, setShuffledRightItems] = useState([]);
  const [selectedLeftId, setSelectedLeftId] = useState(null);
  // matches: { [leftId]: rightId }
  const [matches, setMatches] = useState({});
  const [lines, setLines] = useState([]);

  // Initialize randomized columns
  useEffect(() => {
    if (question && question.pairs) {
      const leftItems = question.pairs.map((p, idx) => ({
        id: p.id,
        text: p.left.replace(/^\d+\.\s*/, ''),
        originalIndex: idx
      }));

      const rightItems = question.pairs.map((p, idx) => ({
        id: p.id,
        text: p.right.replace(/^[A-Z]\.\s*/, ''),
        originalIndex: idx
      }));

      // Fisher-Yates array shuffle
      const shuffle = (arr) => {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      };

      setShuffledLeftItems(shuffle(leftItems));
      setShuffledRightItems(shuffle(rightItems));
      setMatches({});
      setSelectedLeftId(null);
    }
  }, [question.id]);

  // Recalculate SVG line coordinates whenever matches or window resize changes
  const updateLines = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    const computedLines = [];

    Object.entries(matches).forEach(([leftId, rightId]) => {
      const leftEl = leftRefs.current[leftId];
      const rightEl = rightRefs.current[rightId];
      const leftIdx = shuffledLeftItems.findIndex(l => l.id === leftId);

      if (leftEl && rightEl) {
        const leftRect = leftEl.getBoundingClientRect();
        const rightRect = rightEl.getBoundingClientRect();

        const x1 = leftRect.right - containerRect.left;
        const y1 = leftRect.top + leftRect.height / 2 - containerRect.top;
        const x2 = rightRect.left - containerRect.left;
        const y2 = rightRect.top + rightRect.height / 2 - containerRect.top;

        const isPairCorrect = leftId === rightId;
        const colorSet = PAIR_COLORS[(leftIdx >= 0 ? leftIdx : 0) % PAIR_COLORS.length];

        computedLines.push({
          leftId,
          rightId,
          x1,
          y1,
          x2,
          y2,
          isPairCorrect,
          colorSet
        });
      }
    });

    setLines(computedLines);
  };

  useEffect(() => {
    updateLines();
    const handleResize = () => updateLines();
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(updateLines, 100);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [matches, shuffledLeftItems, shuffledRightItems, answeredState]);

  // Select Left Item
  const handleLeftClick = (leftId) => {
    if (answeredState !== null) return;

    if (selectedLeftId === leftId) {
      setSelectedLeftId(null);
    } else {
      setSelectedLeftId(leftId);
    }
  };

  // Match with Right Item
  const handleRightClick = (rightId) => {
    if (answeredState !== null) return;

    if (selectedLeftId) {
      // If right item is already matched to another left item, disconnect that left item first
      const updated = { ...matches };
      Object.keys(updated).forEach(k => {
        if (updated[k] === rightId) delete updated[k];
      });

      updated[selectedLeftId] = rightId;
      setMatches(updated);
      setSelectedLeftId(null);
    } else {
      // If clicked without left selection, check if already matched and disconnect
      const existingLeft = Object.keys(matches).find(k => matches[k] === rightId);
      if (existingLeft) {
        const updated = { ...matches };
        delete updated[existingLeft];
        setMatches(updated);
      }
    }
  };

  const handleDisconnectPair = (leftId) => {
    if (answeredState !== null) return;
    const updated = { ...matches };
    delete updated[leftId];
    setMatches(updated);
    if (selectedLeftId === leftId) setSelectedLeftId(null);
  };

  const handleClearAll = () => {
    if (answeredState !== null) return;
    setMatches({});
    setSelectedLeftId(null);
  };

  const handleVerify = () => {
    if (answeredState !== null) return;

    const totalPairs = question.pairs.length;
    const isAllCorrect = question.pairs.every(p => matches[p.id] === p.id);

    // Form user submission string for review
    const submissionParts = shuffledLeftItems.map((leftItem, lIdx) => {
      const matchedRightId = matches[leftItem.id];
      const matchedRight = shuffledRightItems.find(r => r.id === matchedRightId);
      const rightIdx = shuffledRightItems.findIndex(r => r.id === matchedRightId);
      const rightLetter = rightIdx !== -1 ? String.fromCharCode(65 + rightIdx) : '?';
      return `${lIdx + 1}. ${leftItem.text} ➔ [${rightLetter}] ${matchedRight ? matchedRight.text : 'Unmatched'}`;
    });

    if (onSubmitMatches) {
      onSubmitMatches(matches, isAllCorrect, submissionParts.join(' | '));
    }
  };

  const totalPairsCount = question.pairs.length;
  const matchedPairsCount = Object.keys(matches).length;
  const isAllConnected = matchedPairsCount === totalPairsCount;

  return (
    <div className="matching-quiz-container" ref={containerRef}>
      {/* Top Helper Bar */}
      <div className="matching-instructions-bar">
        <div className="instruct-text">
          <Link2 size={16} className="text-purple" />
          <span>
            {answeredState === null 
              ? 'Click an item in Column A (1–4), then click its corresponding match in Column B (A–D) to draw a connecting line.'
              : 'Review your connections below: Green lines indicate correct matches, Red lines indicate incorrect pairings.'}
          </span>
        </div>
        {answeredState === null && matchedPairsCount > 0 && (
          <button 
            type="button" 
            className="matching-btn-clear"
            onClick={handleClearAll}
          >
            <Unlink size={13} />
            <span>Reset Connections</span>
          </button>
        )}
      </div>

      {/* Main Matching Grid with Center SVG Line Canvas */}
      <div className="matching-board-layout">
        {/* SVG Connector Lines Canvas */}
        <svg className="matching-svg-layer">
          {lines.map((line, idx) => {
            const dx = Math.abs(line.x2 - line.x1) * 0.45;
            const pathData = `M ${line.x1} ${line.y1} C ${line.x1 + dx} ${line.y1}, ${line.x2 - dx} ${line.y2}, ${line.x2} ${line.y2}`;

            let strokeColor = line.colorSet.stroke;
            let strokeDash = 'none';

            if (answeredState !== null) {
              if (line.isPairCorrect) {
                strokeColor = '#16a34a';
              } else {
                strokeColor = '#dc2626';
                strokeDash = '6 4';
              }
            }

            return (
              <g key={idx}>
                {/* Outer Glow Path */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="8"
                  strokeOpacity="0.15"
                />
                {/* Main Connected Cable */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="3.5"
                  strokeDasharray={strokeDash}
                  className="matching-curve-path"
                />
              </g>
            );
          })}
        </svg>

        {/* COLUMN A (LEFT) */}
        <div className="matching-column column-left">
          <div className="column-title-pill pill-col-a">
            <span>COLUMN A (Items 1–{shuffledLeftItems.length})</span>
          </div>

          <div className="matching-cards-stack">
            {shuffledLeftItems.map((p, idx) => {
              const isSelected = selectedLeftId === p.id;
              const matchedRightId = matches[p.id];
              const matchedRightItem = shuffledRightItems.find(r => r.id === matchedRightId);
              const rightIdx = shuffledRightItems.findIndex(r => r.id === matchedRightId);
              const rightLetter = rightIdx !== -1 ? String.fromCharCode(65 + rightIdx) : '';
              const colorSet = PAIR_COLORS[idx % PAIR_COLORS.length];

              let cardStateClass = '';
              if (isSelected) cardStateClass = 'card-selected';
              else if (matchedRightId) cardStateClass = 'card-matched';

              let feedbackCardClass = '';
              if (answeredState !== null && matchedRightId) {
                feedbackCardClass = p.id === matchedRightId ? 'card-feedback-correct' : 'card-feedback-wrong';
              }

              return (
                <div
                  key={p.id}
                  className={`matching-item-card left-item-card ${cardStateClass} ${feedbackCardClass}`}
                  onClick={() => handleLeftClick(p.id)}
                >
                  <div className="card-content-left">
                    <span className="item-index-badge">{idx + 1}</span>
                    <span className="item-main-text">{p.text}</span>
                  </div>

                  {/* Connected Match Pill if linked */}
                  {matchedRightItem && (
                    <div 
                      className="connected-link-pill"
                      style={{ 
                        backgroundColor: colorSet.bg, 
                        borderColor: colorSet.border,
                        color: colorSet.text
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDisconnectPair(p.id);
                      }}
                      title="Click to disconnect"
                    >
                      <span>➔ [{rightLetter}]</span>
                      {answeredState === null && <Unlink size={11} />}
                    </div>
                  )}

                  {/* Anchor Pin Node */}
                  <div 
                    ref={el => leftRefs.current[p.id] = el}
                    className={`anchor-pin pin-right ${matchedRightId ? 'pin-connected' : ''} ${isSelected ? 'pin-active' : ''}`}
                    style={{ borderColor: matchedRightId ? colorSet.stroke : '#94a3b8' }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN B (RIGHT) */}
        <div className="matching-column column-right">
          <div className="column-title-pill pill-col-b">
            <span>COLUMN B (Options A–{String.fromCharCode(64 + shuffledRightItems.length)})</span>
          </div>

          <div className="matching-cards-stack">
            {shuffledRightItems.map((r, rIdx) => {
              const matchedLeftId = Object.keys(matches).find(k => matches[k] === r.id);
              const matchedLeftIdx = shuffledLeftItems.findIndex(l => l.id === matchedLeftId);
              const colorSet = matchedLeftIdx !== -1 ? PAIR_COLORS[matchedLeftIdx % PAIR_COLORS.length] : null;

              let cardStateClass = '';
              if (matchedLeftId) cardStateClass = 'card-matched';

              let feedbackCardClass = '';
              if (answeredState !== null && matchedLeftId) {
                feedbackCardClass = matchedLeftId === r.id ? 'card-feedback-correct' : 'card-feedback-wrong';
              }

              return (
                <div
                  key={r.id}
                  className={`matching-item-card right-item-card ${cardStateClass} ${feedbackCardClass}`}
                  onClick={() => handleRightClick(r.id)}
                >
                  {/* Anchor Pin Node */}
                  <div 
                    ref={el => rightRefs.current[r.id] = el}
                    className={`anchor-pin pin-left ${matchedLeftId ? 'pin-connected' : ''}`}
                    style={{ borderColor: colorSet ? colorSet.stroke : '#94a3b8' }}
                  />

                  <div className="card-content-right">
                    <span className="item-index-badge badge-letter">
                      {String.fromCharCode(65 + rIdx)}
                    </span>
                    <span className="item-main-text">{r.text}</span>
                  </div>

                  {/* Connected Match Pill if linked */}
                  {matchedLeftId && colorSet && (
                    <div 
                      className="connected-link-pill"
                      style={{ 
                        backgroundColor: colorSet.bg, 
                        borderColor: colorSet.border,
                        color: colorSet.text
                      }}
                    >
                      <span>Item #{matchedLeftIdx + 1}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Submit Row */}
      {answeredState === null && (
        <div className="matching-bottom-actions">
          <div className="matching-counter-tag">
            <span className="count-bold">{matchedPairsCount}</span> of {totalPairsCount} Pairs Connected
          </div>

          <button
            type="button"
            className="btn-tactile btn-tactile-purple btn-match-verify"
            disabled={!isAllConnected}
            onClick={handleVerify}
          >
            <Check size={16} />
            <span>Verify & Submit Matches</span>
          </button>
        </div>
      )}
    </div>
  );
}
