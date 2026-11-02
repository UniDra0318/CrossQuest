export const QUIZ_THEMES = [
  {
    id: 'cyber_grid',
    name: 'Cyber Grid',
    tagline: 'Neon isometric matrix grid',
    icon: '⚡',
    accent: '#06b6d4',
    bgStyle: {
      background: 'linear-gradient(135deg, #0b092b 0%, #170d38 50%, #0c1529 100%)',
      backgroundImage: `
        linear-gradient(rgba(6, 182, 212, 0.12) 1px, transparent 1px),
        linear-gradient(90deg, rgba(6, 182, 212, 0.12) 1px, transparent 1px)
      `,
      backgroundSize: '36px 36px'
    },
    cardStyle: {
      background: '#120f30',
      border: '1.5px solid rgba(6, 182, 212, 0.35)',
      boxShadow: '0 20px 50px rgba(6, 182, 212, 0.15)',
      color: '#f8fafc'
    },
    timerStyle: {
      background: '#16133d',
      border: '1.5px solid #06b6d4',
      color: '#22d3ee'
    }
  },
  {
    id: 'cosmic_nebula',
    name: 'Cosmic Nebula',
    tagline: 'Deep space stellar galaxy',
    icon: '🌌',
    accent: '#d946ef',
    bgStyle: {
      background: 'radial-gradient(ellipse at 50% 15%, #3b0764 0%, #09090b 70%)',
      backgroundImage: `
        radial-gradient(circle at 20% 75%, rgba(217, 70, 239, 0.18) 0%, transparent 45%),
        radial-gradient(circle at 80% 25%, rgba(99, 102, 241, 0.22) 0%, transparent 45%)
      `
    },
    cardStyle: {
      background: '#170b28',
      border: '1.5px solid rgba(217, 70, 239, 0.35)',
      boxShadow: '0 20px 50px rgba(217, 70, 239, 0.15)',
      color: '#f8fafc'
    },
    timerStyle: {
      background: '#230f3d',
      border: '1.5px solid #d946ef',
      color: '#f0abfc'
    }
  },
  {
    id: 'retro_synthwave',
    name: 'Retro Synthwave',
    tagline: '80s arcade neon sunset',
    icon: '🌇',
    accent: '#f97316',
    bgStyle: {
      background: 'linear-gradient(180deg, #18032e 0%, #3b0764 40%, #831843 75%, #0f021f 100%)',
      backgroundImage: `
        linear-gradient(0deg, rgba(249, 115, 22, 0.1) 1px, transparent 1px)
      `,
      backgroundSize: '100% 28px'
    },
    cardStyle: {
      background: '#230b34',
      border: '1.5px solid rgba(249, 115, 22, 0.4)',
      boxShadow: '0 20px 50px rgba(249, 115, 22, 0.18)',
      color: '#f8fafc'
    },
    timerStyle: {
      background: '#340f47',
      border: '1.5px solid #f97316',
      color: '#fdba74'
    }
  },
  {
    id: 'emerald_matrix',
    name: 'Emerald Matrix',
    tagline: 'Bio-tech digital flow',
    icon: '🌿',
    accent: '#10b981',
    bgStyle: {
      background: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #021a14 100%)',
      backgroundImage: `
        linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)
      `,
      backgroundSize: '28px 28px'
    },
    cardStyle: {
      background: '#063327',
      border: '1.5px solid rgba(16, 185, 129, 0.35)',
      boxShadow: '0 20px 50px rgba(16, 185, 129, 0.15)',
      color: '#f8fafc'
    },
    timerStyle: {
      background: '#094233',
      border: '1.5px solid #10b981',
      color: '#6ee7b7'
    }
  },
  {
    id: 'ocean_abyss',
    name: 'Ocean Abyssal',
    tagline: 'Bioluminescent deep sea trench',
    icon: '🌊',
    accent: '#38bdf8',
    bgStyle: {
      background: 'linear-gradient(135deg, #082f49 0%, #0c4a6e 50%, #020617 100%)',
      backgroundImage: `
        radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.12) 0%, transparent 60%)
      `
    },
    cardStyle: {
      background: '#09253d',
      border: '1.5px solid rgba(56, 189, 248, 0.35)',
      boxShadow: '0 20px 50px rgba(56, 189, 248, 0.15)',
      color: '#f8fafc'
    },
    timerStyle: {
      background: '#0e3454',
      border: '1.5px solid #38bdf8',
      color: '#7dd3fc'
    }
  },
  {
    id: 'obsidian_zen',
    name: 'Obsidian Zen',
    tagline: 'Minimalist focus mode',
    icon: '🖤',
    accent: '#94a3b8',
    bgStyle: {
      background: 'linear-gradient(135deg, #0b0f19 0%, #111827 100%)'
    },
    cardStyle: {
      background: '#131b2e',
      border: '1.5px solid #1f2937',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
      color: '#f8fafc'
    },
    timerStyle: {
      background: '#1e293b',
      border: '1.5px solid #334155',
      color: '#cbd5e1'
    }
  }
];

export const DEFAULT_QUIZ_THEME_ID = 'cyber_grid';

export function getQuizTheme(themeId) {
  return QUIZ_THEMES.find(t => t.id === themeId) || QUIZ_THEMES[0];
}

