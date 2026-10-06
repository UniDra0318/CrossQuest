import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Flame, 
  Play, 
  Sparkles, 
  Shield, 
  Check, 
  Lock, 
  Award, 
  ArrowRight,
  Zap,
  Target,
  ChevronRight
} from 'lucide-react';
import logoStacked from '../assets/crossquest-logo-stacked.svg';
import mascotRobot from '../assets/mascot-robot.png';
import { 
  IsometricPrismPlay3D, 
  IsometricDiamond3D, 
  IsometricMedal3D, 
  IsometricInfosecBox3D 
} from '../components/IsometricIcons';

export default function LandingView() {
  const navigate = useNavigate();
  const [pinCode, setPinCode] = useState('');
  const [ctaPinCode, setCtaPinCode] = useState('');

  const handleJoinPin = (pin) => {
    // If user enters a pin, direct to login or dashboard with state
    navigate('/login');
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page-root">
      {/* 1. TOP NAVBAR */}
      <header className="landing-navbar">
        <div className="landing-nav-container">
          {/* Brand Logo */}
          <div className="landing-brand-wrap" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src={logoStacked} alt="CrossQuest Logo" className="landing-logo-img" />
            <span className="landing-brand-tag">ENTERPRISE LEARNING</span>
          </div>

          {/* Navigation Anchors */}
          <nav className="landing-nav-links">
            <button type="button" onClick={() => scrollToSection('how-it-works')} className="landing-nav-link">
              QUESTS
            </button>
            <button type="button" onClick={() => scrollToSection('quest-map')} className="landing-nav-link">
              QUEST MAP
            </button>
            <button type="button" onClick={() => scrollToSection('badges-section')} className="landing-nav-link">
              BADGES
            </button>
            <button type="button" onClick={() => scrollToSection('leaderboard-section')} className="landing-nav-link">
              LEADERBOARD
            </button>
            <button type="button" onClick={() => navigate('/login')} className="landing-nav-link">
              CERTIFICATIONS
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="landing-nav-actions">
            <button 
              type="button" 
              className="landing-signin-btn"
              onClick={() => navigate('/login')}
            >
              Sign in
            </button>
            <button 
              type="button" 
              className="landing-join-btn"
              onClick={() => {
                const input = document.getElementById('hero-pin-input');
                if (input) input.focus();
              }}
            >
              Join a quest
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION: LEVEL UP */}
      <section className="landing-hero-section">
        <div className="landing-content-container">
          {/* Top Ticker */}
          <div className="landing-hero-ticker flex-between">
            <span className="hero-kicker-text">[ GAMIFIED ENTERPRISE LEARNING ]</span>
            <div className="hero-live-badge">
              <span className="live-indicator-dot" />
              <span>QUESTS LIVE NOW</span>
            </div>
          </div>

          {/* Giant Title */}
          <h1 className="landing-hero-giant-title">LEVEL UP</h1>

          {/* Main Interactive Hero Card */}
          <div className="landing-hero-card">
            {/* Left Column: Form & Info */}
            <div className="landing-hero-card-left">
              <div className="hero-category-label">
                ONBOARDING / COMPLIANCE / CERTIFICATION
              </div>
              <p className="hero-card-desc">
                Complete today's interactive quest to extend your <strong>7-day streak</strong> and climb the corporate leaderboard.
              </p>

              {/* Join PIN Capsule Bar */}
              <div className="hero-join-bar">
                <input
                  id="hero-pin-input"
                  type="text"
                  placeholder="Enter Game PIN / Quest Code..."
                  className="hero-join-input"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleJoinPin(pinCode);
                  }}
                />
                <button 
                  className="hero-join-action-btn"
                  onClick={() => handleJoinPin(pinCode)}
                >
                  <Play size={14} fill="currentColor" />
                  <span>Join Quest</span>
                </button>
              </div>

              {/* Footnote Link */}
              <div className="hero-footnote-link" onClick={() => navigate('/login')}>
                NO PIN? SIGN IN TO SEE YOUR ASSIGNED QUESTS &rarr;
              </div>
            </div>

            {/* Right Column: Visual Stage with Mascot & Floating Badges */}
            <div className="landing-hero-card-right">
              {/* Floating Chips */}
              <div className="floating-chip chip-xp">
                <span>+50 XP / QUEST CLEARED</span>
              </div>

              <div className="floating-chip chip-streak">
                <Flame size={14} fill="#ff6a00" className="text-orange" />
                <span>7 Days ACTIVE STREAK</span>
              </div>

              <div className="floating-chip chip-badge">
                <Shield size={14} className="text-blue" />
                <span>BADGE UNLOCKED · Security Champion</span>
              </div>

              {/* Isometric Infosec Box in top right corner */}
              <div className="floating-infosec-box">
                <IsometricInfosecBox3D size={74} />
              </div>

              {/* 3D Mascot Character */}
              <div className="hero-mascot-center">
                <img 
                  src={mascotRobot} 
                  alt="CrossQuest 3D Mascot Robot" 
                  className="landing-mascot-img" 
                />
              </div>
            </div>

            {/* Bottom Tracks Strip */}
            <div className="landing-hero-card-bottom">
              <span className="tracks-label">QUEST TRACKS:</span>
              <div className="tracks-list">
                <div className="track-pill track-blue">
                  <span className="track-square" />
                  <span className="track-title">Information Security</span>
                  <span className="track-q-count">5 QUESTIONS</span>
                </div>
                <div className="track-pill track-green">
                  <span className="track-square" />
                  <span className="track-title">Access Control</span>
                  <span className="track-q-count">5 QUESTIONS</span>
                </div>
                <div className="track-pill track-red">
                  <span className="track-square" />
                  <span className="track-title">Privacy Management</span>
                  <span className="track-q-count">5 QUESTIONS</span>
                </div>
                <div className="track-pill track-purple">
                  <span className="track-square" />
                  <span className="track-title">Database Security</span>
                  <span className="track-q-count">5 QUESTIONS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION: THREE MOVES. ONE STREAK. */}
      <section id="how-it-works" className="landing-section-features">
        <div className="landing-content-container">
          <div className="section-header-tag">[ 01 / HOW A QUEST WORKS ]</div>
          <h2 className="section-main-heading">Three moves. One streak.</h2>

          <div className="features-three-grid">
            {/* Step 1 */}
            <div className="feature-step-card">
              <div className="feature-icon-slot">
                <IsometricPrismPlay3D size={64} />
              </div>
              <div className="feature-step-pill">STEP 01</div>
              <h3 className="feature-step-title">Join with a PIN</h3>
              <p className="feature-step-desc">
                Enter the Game PIN your instructor shares, or open one of the quests already assigned to you on your dashboard.
              </p>
            </div>

            {/* Step 2 */}
            <div className="feature-step-card">
              <div className="feature-icon-slot">
                <IsometricDiamond3D size={64} />
              </div>
              <div className="feature-step-pill">STEP 02</div>
              <h3 className="feature-step-title">Play the scenario</h3>
              <p className="feature-step-desc">
                Work through five-question quests on Information Security, Access Control, Privacy Management and Database Security.
              </p>
            </div>

            {/* Step 3 */}
            <div className="feature-step-card">
              <div className="feature-icon-slot">
                <IsometricMedal3D size={64} />
              </div>
              <div className="feature-step-pill">STEP 03</div>
              <h3 className="feature-step-title">Earn, streak, climb</h3>
              <p className="feature-step-desc">
                Collect badges, protect your daily streak and move up the corporate leaderboard on the way to your certifications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECTION: EVERY COURSE IS A LEVEL (THE QUEST MAP) */}
      <section id="quest-map" className="landing-quest-map-section">
        <div className="landing-content-container">
          <div className="map-kicker-tag">[ 02 / THE QUEST MAP ]</div>
          <h2 className="map-main-heading">Every course is a level.</h2>
          <p className="map-sub-heading">
            Assigned activities become stops on your map. Clear a stop to light up the path, and unlock the next one.
          </p>

          {/* Interactive Quest Path / Nodes */}
          <div className="quest-roadmap-canvas">
            {/* SVG Connecting Line */}
            <svg className="roadmap-path-svg" viewBox="0 0 1100 240" fill="none" preserveAspectRatio="none">
              {/* Completed Glowing Line */}
              <path 
                d="M 80 180 Q 220 180 250 140 T 420 100 T 590 140" 
                stroke="#ff6a00" 
                strokeWidth="4" 
                strokeLinecap="round" 
              />
              {/* Uncompleted Dashed Path */}
              <path 
                d="M 590 140 Q 670 140 700 150 T 870 120 T 1020 90" 
                stroke="#6320ee" 
                strokeWidth="3" 
                strokeDasharray="6 6" 
                strokeLinecap="round" 
              />
            </svg>

            {/* Stop Nodes */}
            <div className="roadmap-nodes-container">
              {/* Node 1: Orientation */}
              <div className="map-node node-cleared" style={{ left: '5%', top: '65%' }}>
                <div className="node-circle">
                  <Check size={16} strokeWidth={3} />
                </div>
                <div className="node-label">Orientation</div>
                <div className="node-status text-orange">CLEARED</div>
              </div>

              {/* Node 2: Information Security */}
              <div className="map-node node-cleared" style={{ left: '20%', top: '48%' }}>
                <div className="node-circle">
                  <Check size={16} strokeWidth={3} />
                </div>
                <div className="node-label">Information Security</div>
                <div className="node-status text-orange">94% ACCURACY</div>
              </div>

              {/* Node 3: Access Control */}
              <div className="map-node node-cleared" style={{ left: '36%', top: '30%' }}>
                <div className="node-circle">
                  <Check size={16} strokeWidth={3} />
                </div>
                <div className="node-label">Access Control</div>
                <div className="node-status text-orange">100% ACCURACY</div>
              </div>

              {/* Node 4: Privacy Management */}
              <div className="map-node node-cleared" style={{ left: '51%', top: '48%' }}>
                <div className="node-circle">
                  <Check size={16} strokeWidth={3} />
                </div>
                <div className="node-label">Privacy Management</div>
                <div className="node-status text-orange">88% ACCURACY</div>
              </div>

              {/* Node 5: Database Security (Active: YOU ARE HERE) */}
              <div className="map-node node-active" style={{ left: '65%', top: '55%' }}>
                <div className="node-active-pill">YOU ARE HERE</div>
                <div className="node-circle-active">
                  <span className="radar-pulse" />
                  <Zap size={18} fill="#ffffff" />
                </div>
                <div className="node-label">Database Security</div>
                <div className="node-status text-gold">DUE IN 3 DAYS</div>
              </div>

              {/* Node 6: Final Assessment (Locked) */}
              <div className="map-node node-locked" style={{ left: '80%', top: '40%' }}>
                <div className="node-circle-locked">
                  <Lock size={15} />
                </div>
                <div className="node-label">Final Assessment</div>
                <div className="node-status text-muted">LOCKED</div>
              </div>

              {/* Node 7: Certified (Locked) */}
              <div className="map-node node-locked" style={{ left: '94%', top: '25%' }}>
                <div className="node-circle-locked">
                  <Award size={15} />
                </div>
                <div className="node-label">Certified</div>
                <div className="node-status text-muted">LOCKED</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECTION: COLLECT THEM ALL & CORPORATE LEADERBOARD */}
      <section id="badges-section" className="landing-split-section">
        <div className="landing-content-container">
          <div className="landing-split-grid">
            {/* Left: Badges Showcase */}
            <div className="landing-badges-block">
              <div className="section-header-tag">[ 03 / BADGES ]</div>
              <h2 className="section-main-heading mb-24">Collect them all.</h2>

              <div className="landing-badges-grid">
                {/* Badge 1 */}
                <div className="landing-badge-card">
                  <div className="landing-badge-icon" style={{ backgroundColor: '#fef9c3', borderColor: '#fef08a' }}>
                    <span>⭐</span>
                  </div>
                  <h4 className="landing-badge-name">First Step</h4>
                  <p className="landing-badge-desc">Completed orientation modules</p>
                </div>

                {/* Badge 2 */}
                <div className="landing-badge-card">
                  <div className="landing-badge-icon" style={{ backgroundColor: '#dbeafe', borderColor: '#bfdbfe' }}>
                    <span>🛡️</span>
                  </div>
                  <h4 className="landing-badge-name">Security Champion</h4>
                  <p className="landing-badge-desc">Aced Security & Compliance Assessment</p>
                </div>

                {/* Badge 3 */}
                <div className="landing-badge-card">
                  <div className="landing-badge-icon" style={{ backgroundColor: '#ffedd5', borderColor: '#fed7aa' }}>
                    <span>🔥</span>
                  </div>
                  <h4 className="landing-badge-name">7-Day Streak</h4>
                  <p className="landing-badge-desc">Active training 7 consecutive days</p>
                </div>

                {/* Badge 4 */}
                <div className="landing-badge-card">
                  <div className="landing-badge-icon" style={{ backgroundColor: '#f3e8ff', borderColor: '#e9d5ff' }}>
                    <span>⚡</span>
                  </div>
                  <h4 className="landing-badge-name">Security Decoder</h4>
                  <p className="landing-badge-desc">Verified policy attribute satisfaction</p>
                </div>
              </div>
            </div>

            {/* Right: Corporate Leaderboard */}
            <div id="leaderboard-section" className="landing-leaderboard-block">
              <div className="landing-leaderboard-card">
                <div className="leaderboard-tag-top">[ 04 / LEADERBOARD ]</div>
                <h3 className="leaderboard-heading">Corporate leaderboard</h3>

                {/* 3D Podium Graphic */}
                <div className="landing-podium-container">
                  {/* Rank 2 (Purple) */}
                  <div className="landing-podium-col rank-2">
                    <span className="landing-podium-name">[Name]</span>
                    <div className="landing-podium-bar bar-purple">
                      <span className="landing-podium-number">2</span>
                    </div>
                  </div>

                  {/* Rank 1 (Orange/Gold - Taller) */}
                  <div className="landing-podium-col rank-1">
                    <span className="landing-podium-name">[Name]</span>
                    <div className="landing-podium-bar bar-orange">
                      <span className="landing-podium-number">1</span>
                    </div>
                  </div>

                  {/* Rank 3 (Blue) */}
                  <div className="landing-podium-col rank-3">
                    <span className="landing-podium-name">[Name]</span>
                    <div className="landing-podium-bar bar-blue">
                      <span className="landing-podium-number">3</span>
                    </div>
                  </div>
                </div>

                {/* Bottom User Bar */}
                <div className="landing-leaderboard-user-bar">
                  <div className="user-bar-left flex-align gap-8">
                    <div className="landing-avatar-circle">JD</div>
                    <div className="user-bar-names">
                      <span className="user-primary-name">Juan Dela Cruz</span>
                      <span className="user-sub-info">YOU / RANK [#1]</span>
                    </div>
                  </div>
                  <div className="user-bar-points">
                    <span>⚡ 7</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECTION: CALL TO ACTION BANNER */}
      <section className="landing-cta-section">
        <div className="landing-content-container">
          <div className="landing-cta-card">
            <div className="landing-cta-left">
              <span className="cta-kicker-tag">[ READY PLAYER ? ]</span>
              <h2 className="cta-main-title">Your next quest is waiting.</h2>
              
              <div className="cta-join-bar">
                <input
                  type="text"
                  placeholder="Enter Game PIN / Quest Code..."
                  className="cta-join-input"
                  value={ctaPinCode}
                  onChange={(e) => setCtaPinCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleJoinPin(ctaPinCode);
                  }}
                />
                <button 
                  className="cta-join-btn"
                  onClick={() => handleJoinPin(ctaPinCode)}
                >
                  <Play size={14} fill="currentColor" />
                  <span>Join Quest</span>
                </button>
              </div>
            </div>

            <div className="landing-cta-right">
              <IsometricInfosecBox3D size={110} />
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="landing-footer">
        <div className="landing-content-container flex-between footer-inner">
          <div className="footer-copyright">
            &copy; 2026 CROSSQUEST / ENTERPRISE LEARNING
          </div>
          <div className="footer-nav-links">
            <button type="button" onClick={() => scrollToSection('how-it-works')} className="footer-link">
              QUESTS
            </button>
            <button type="button" onClick={() => scrollToSection('quest-map')} className="footer-link">
              MAP
            </button>
            <button type="button" onClick={() => scrollToSection('badges-section')} className="footer-link">
              BADGES
            </button>
            <button type="button" onClick={() => scrollToSection('leaderboard-section')} className="footer-link">
              LEADERBOARD
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
