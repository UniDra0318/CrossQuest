import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Play, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import logoStacked from '../assets/crossquest-logo-stacked.svg';
import Mascot from '../components/Mascot';
import SpinCube from '../components/SpinCube';
import IsoCube from '../components/IsoCube';
import QuestMap from '../components/QuestMap';
import BadgeCoin from '../components/BadgeCoin';
import StreakCard from '../components/StreakCard';
import Podium from '../components/Podium';
import { TRACKS } from '../data/tracks';
import { badges, leaderboard } from '../data/mock';
import '../styles/home.css';

export default function LandingView() {
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();
  const [pinCode, setPinCode] = useState('');
  const [ctaPinCode, setCtaPinCode] = useState('');

  const handleJoinPin = (pin) => {
    navigate('/login');
  };

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="home">
      {/* 1. SITE HEADER / NAVBAR */}
      <header className="site-header">
        <div className="logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
          <img src={logoStacked} alt="CrossQuest Logo" style={{ height: '42px', width: 'auto' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="logo__tag">ENTERPRISE LEARNING</span>
          </div>
        </div>

        <nav className="site-nav">
          <button type="button" onClick={() => scrollTo('how-it-works')}>Quests</button>
          <button type="button" onClick={() => scrollTo('quest-map')}>Quest Map</button>
          <button type="button" onClick={() => scrollTo('badges')}>Badges</button>
          <button type="button" onClick={() => scrollTo('leaderboard')}>Leaderboard</button>
          <button type="button" onClick={() => navigate('/login')}>Certifications</button>
        </nav>

        <div className="site-header__actions">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button type="button" className="site-header__signin" onClick={() => navigate('/login')}>
            Sign in
          </button>
          <button
            type="button"
            className="cq-btn cq-btn--orange"
            onClick={() => navigate('/login')}
          >
            Enter Portal
          </button>
        </div>
      </header>

      {/* 2. HERO: LEVEL UP */}
      <section className="hero">
        <div className="hero__box">
          <div className="hero__corner hero__corner--l" />
          <div className="hero__corner hero__corner--r" />

          {/* Meta ticker */}
          <div className="hero__meta">
            <span>[ GAMIFIED ENTERPRISE LEARNING ]</span>
            <span>QUESTS LIVE NOW &#9679;</span>
          </div>

          {/* Giant Title */}
          <h1 className="hero__title">
            LEVEL <span>UP</span>
          </h1>

          {/* Row: Left Copy & Right 3D Stage */}
          <div className="hero__row">
            {/* Left Copy */}
            <div className="hero__copy">
              <span className="hero__kicker">ONBOARDING / COMPLIANCE / CERTIFICATION</span>
              <p className="hero__lede">
                Complete today's interactive quest to extend your <strong>7-day streak</strong> and climb the corporate leaderboard.
              </p>

              {/* Enterprise Action Buttons */}
              <div className="hero__actions" style={{ display: 'flex', gap: '12px', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="cq-btn cq-btn--purple"
                  style={{ padding: '0.85rem 1.75rem', fontSize: '1rem', fontWeight: 700 }}
                  onClick={() => navigate('/login')}
                >
                  <Play size={16} fill="currentColor" />
                  <span>Start Your Quest</span>
                </button>
                <button
                  type="button"
                  className="cq-btn cq-btn--orange"
                  style={{ padding: '0.85rem 1.5rem', fontSize: '0.95rem' }}
                  onClick={() => scrollTo('quest-map')}
                >
                  <span>Explore Curriculum</span>
                </button>
              </div>

              <div className="hero__hint" onClick={() => navigate('/login')} style={{ cursor: 'pointer', marginTop: '1rem' }}>
                LOG IN WITH YOUR ORGANIZATIONAL ACCOUNT &rarr;
              </div>
            </div>

            {/* Right 3D Stage */}
            <div className="stage">
              <div className="stage__glow" />

              {/* Pure CSS 3D Quest Bot Mascot */}
              <div className="stage__mascot">
                <Mascot />
              </div>

              {/* Top-Right 3D Spinning Tile */}
              <div className="stage__tile">
                <div className="stage__bracket stage__bracket--tl" />
                <div className="stage__bracket stage__bracket--tr" />
                <div className="stage__bracket stage__bracket--bl" />
                <div className="stage__bracket stage__bracket--br" />
                <div className="stage__tile-scene">
                  <SpinCube size={74} />
                </div>
              </div>

              {/* Floating XP Badge */}
              <div className="stage__xp">
                <span>+50 XP / QUEST CLEARED</span>
              </div>

              {/* Floating Streak Card */}
              <div className="stage__streak">
                <StreakCard days={7} variant="solid" />
              </div>

              {/* Floating Toast Pill */}
              <div className="stage__toast">
                <div className="toast">
                  <div className="toast__coin">
                    <Shield size={20} fill="currentColor" />
                  </div>
                  <div>
                    <div className="toast__tag">BADGE UNLOCKED</div>
                    <div className="toast__title">Security Champion</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tracks Strip Bottom */}
          <div className="tracks">
            <div className="tracks__label">QUEST TRACKS:</div>
            {Object.entries(TRACKS).map(([key, track]) => (
              <div key={key} className="tracks__cell">
                <div className="tracks__dot" style={{ backgroundColor: track.dot }} />
                <div>
                  <div className="tracks__name">{track.name}</div>
                  <div className="tracks__count">5 QUESTIONS</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. SECTION: THREE MOVES. ONE STREAK. */}
      <section id="how-it-works" className="section">
        <span className="cq-eyebrow">[ 01 / HOW A QUEST WORKS ]</span>
        <h2 className="cq-h2">Three moves. One streak.</h2>

        <div className="steps">
          {/* Step 1 */}
          <div className="step cq-tilt">
            <div className="step__scene">
              <IsoCube size={68} color="#00314d" top="#07456b" right="#002236" label="QUEST" />
            </div>
            <div className="step__no">STEP 01</div>
            <h3>Open your quest</h3>
            <p>
              Log in with your organizational account and open the training modules and quizzes scheduled by your trainer.
            </p>
          </div>

          {/* Step 2 */}
          <div className="step cq-tilt">
            <div className="step__scene">
              <IsoCube size={68} color="#ff7a1a" top="#ffd1a8" right="#ff9a4d" label="PLAY" />
            </div>
            <div className="step__no">STEP 02</div>
            <h3>Play the scenario</h3>
            <p>
              Work through five-question quests on Information Security, Access Control, Privacy Management and Database Security.
            </p>
          </div>

          {/* Step 3 */}
          <div className="step cq-tilt">
            <div className="step__scene">
              <IsoCube size={68} color="#ffc53d" top="#fff0c2" right="#ffd566" label="XP" />
            </div>
            <div className="step__no">STEP 03</div>
            <h3>Earn, streak, climb</h3>
            <p>
              Collect badges, protect your daily streak and move up the corporate leaderboard on the way to your certifications.
            </p>
          </div>
        </div>
      </section>

      {/* 4. SECTION: EVERY COURSE IS A LEVEL (THE QUEST MAP) */}
      <section id="quest-map" className="band">
        <div className="section">
          <span className="cq-eyebrow band__eyebrow">[ 02 / THE QUEST MAP ]</span>
          <h2 className="cq-h2">Every course is a level.</h2>
          <p className="band__lede">
            Assigned activities become stops on your map. Clear a stop to light up the path, and unlock the next one.
          </p>

          <div className="band__map">
            <QuestMap />
          </div>
        </div>
      </section>

      {/* 5. SECTION: BADGES & LEADERBOARD */}
      <section id="badges" className="section">
        <div className="bl">
          {/* Badges Left */}
          <div className="bl__badges">
            <span className="cq-eyebrow">[ 03 / BADGES ]</span>
            <h2 className="cq-h2">Collect them all.</h2>

            <div className="badge-grid">
              {badges.map((badge) => (
                <div key={badge.id} className="badge-card cq-tilt">
                  <BadgeCoin badge={badge} />
                  <h3>{badge.title}</h3>
                  <p>{badge.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard Right */}
          <div id="leaderboard" className="lb">
            <span className="lb__eyebrow">[ 04 / LEADERBOARD ]</span>
            <h3 className="lb__title">Corporate leaderboard</h3>

            <Podium top={leaderboard.top} />

            <div className="lb__me">
              <div className="lb__me-id">
                <div className="lb__avatar">JD</div>
                <div>
                  <div className="lb__me-name">Juan Dela Cruz</div>
                  <div className="lb__me-rank">YOU / RANK [#1]</div>
                </div>
              </div>
              <div className="lb__me-streak">
                <span>&#9889; 7</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CTA BANNER */}
      <div className="cta-wrap">
        <div className="cta">
          <div className="cta__copy">
            <span className="cta__eyebrow">[ ENTERPRISE LEARNING PORTAL ]</span>
            <h2>Your training quest is waiting.</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1.5rem', maxWidth: '480px' }}>
              Access corporate learning paths, verify cryptographic certificates, and track team progress securely.
            </p>

            <div>
              <button
                type="button"
                className="cq-btn cq-btn--orange"
                style={{ padding: '0.85rem 2rem', fontSize: '1rem', fontWeight: 700 }}
                onClick={() => navigate('/login')}
              >
                <Play size={16} fill="currentColor" />
                <span>Log In to Enterprise Portal</span>
              </button>
            </div>
          </div>

          <div className="cta__cube">
            <SpinCube size={120} />
          </div>
        </div>
      </div>

      {/* 7. SITE FOOTER */}
      <footer className="site-footer">
        <div>&copy; 2026 CROSSQUEST / ENTERPRISE LEARNING</div>
        <div className="site-footer__links">
          <button type="button" onClick={() => scrollTo('how-it-works')}>Quests</button>
          <button type="button" onClick={() => scrollTo('quest-map')}>Map</button>
          <button type="button" onClick={() => scrollTo('badges')}>Badges</button>
          <button type="button" onClick={() => scrollTo('leaderboard')}>Leaderboard</button>
        </div>
      </footer>
    </div>
  );
}
