import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/home.css';

export default function LandingView() {
  const navigate = useNavigate();

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="cq-landing">
      {/* 1. SITE HEADER / NAVBAR */}
      <header className="cq-landing-header">
        <span 
          className="cq-brand-logo"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="CrossQuest - Crossworks Training & Consulting"
        >
          <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
            <rect width="30" height="30" rx="8" fill="#00314d"></rect>
            <path d="M9 9l12 12M21 9L9 21" stroke="#f0605d" strokeWidth="3.2" strokeLinecap="round"></path>
          </svg>
          CrossQuest
        </span>

        <nav className="cq-landing-nav">
          <button type="button" onClick={() => scrollTo('programs')}>Programs</button>
          <button type="button" onClick={() => scrollTo('how-it-works')}>Quest map</button>
          <button type="button" onClick={() => scrollTo('how-it-works')}>Leaderboard</button>
          <button type="button" onClick={() => navigate('/login')}>Certifications</button>
        </nav>

        <div className="cq-landing-header-actions">
          <button 
            type="button" 
            className="cq-signin-link"
            onClick={() => navigate('/login')}
          >
            Sign in
          </button>
          <button 
            type="button" 
            className="cq-enter-btn"
            onClick={() => navigate('/login')}
          >
            Enter portal
          </button>
        </div>
      </header>

      {/* 2. HERO: TRAINING THAT PEOPLE ACTUALLY FINISH */}
      <section className="cq-hero-stack">
        <div className="cq-hero-copy">
          <div className="cq-hero-eyebrow">Crossworks Training &amp; Consulting</div>
          <h1 className="cq-hero-title">Training that people actually finish.</h1>
          <p className="cq-hero-lead">
            Project management, leadership and future-proof skills as short quests. Build a streak, earn badges and collect verified certificates.
          </p>
          <div className="cq-hero-cta-group">
            <button 
              type="button"
              className="cq-btn-primary"
              onClick={() => navigate('/login')}
            >
              Start your quest
            </button>
            <button 
              type="button"
              className="cq-btn-secondary"
              onClick={() => scrollTo('programs')}
            >
              View programs
            </button>
          </div>
        </div>

        {/* Hero Right: Live Interactive Quest Card Preview */}
        <div className="cq-hero-quest-card">
          <div className="cq-quest-card-header">
            <span>Today's quest</span>
            <span>7-day streak</span>
          </div>
          <h3 className="cq-quest-card-title">Stakeholder Management Basics</h3>
          <div className="cq-quest-progress-track">
            <div className="cq-quest-progress-fill"></div>
          </div>
          <div className="cq-quest-progress-meta">
            <span>3 of 5 questions</span>
            <span>+50 XP</span>
          </div>
          <div className="cq-quest-stats-row">
            <div className="cq-quest-stat-box">
              <div className="cq-quest-stat-val">12,877</div>
              <div className="cq-quest-stat-lbl">Total XP</div>
            </div>
            <div className="cq-quest-stat-box">
              <div className="cq-quest-stat-val">Lvl 4</div>
              <div className="cq-quest-stat-lbl">Project Lead</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THREE PROGRAMS SECTION */}
      <section id="programs" className="cq-programs-section">
        <div className="cq-programs-container">
          <h2 className="cq-section-heading">Three programs. One learning path.</h2>
          <div className="cq-programs-grid">
            <div className="cq-program-card">
              <div className="cq-accent-bar" style={{ background: '#0284c7' }}></div>
              <h3>Project Management</h3>
              <p>The best project management training in the Philippines, in five-question quests.</p>
            </div>
            <div className="cq-program-card">
              <div className="cq-accent-bar" style={{ background: '#059669' }}></div>
              <h3>Future-Proof Skills</h3>
              <p>Business agility, design thinking and AI for the modern workplace.</p>
            </div>
            <div className="cq-program-card">
              <div className="cq-accent-bar" style={{ background: '#f0605d' }}></div>
              <h3>Leadership</h3>
              <p>Equip your future leaders for the challenges of today and tomorrow.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="cq-works-section">
        <h2 className="cq-section-heading">How it works</h2>
        <div className="cq-works-grid">
          <div>
            <div className="cq-work-step-num">01</div>
            <h3 className="cq-work-step-title">Open your quest</h3>
            <p className="cq-work-step-desc">Sign in with your company account and see what your trainer assigned.</p>
          </div>
          <div>
            <div className="cq-work-step-num">02</div>
            <h3 className="cq-work-step-title">Play the scenario</h3>
            <p className="cq-work-step-desc">Short quizzes that fit between meetings.</p>
          </div>
          <div>
            <div className="cq-work-step-num">03</div>
            <h3 className="cq-work-step-title">Earn and get certified</h3>
            <p className="cq-work-step-desc">Collect badges, climb the leaderboard and receive verifiable certificates.</p>
          </div>
        </div>
      </section>

      {/* 5. BOTTOM CTA BANNER SECTION */}
      <section className="cq-cta-banner-section">
        <div className="cq-cta-banner-box">
          <div>
            <h2 className="cq-cta-banner-title">Your training quest is waiting.</h2>
            <p className="cq-cta-banner-sub">Log in with your organizational account.</p>
          </div>
          <button 
            type="button" 
            className="cq-btn-primary"
            onClick={() => navigate('/login')}
          >
            Log in to portal
          </button>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="cq-landing-footer">
        © 2026 CrossQuest · Crossworks Training &amp; Consulting · Ortigas Center, Pasig
      </footer>
    </div>
  );
}
