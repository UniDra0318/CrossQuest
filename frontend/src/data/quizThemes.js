export const QUIZ_THEMES = [
  {
    id: 'cyber_grid',
    animClass: 'theme-anim-cyber-grid',
    name: 'Cyber Grid',
    tagline: 'Neon isometric matrix grid',
    icon: '⚡',
    accent: '#06b6d4',
    bgStyle: {
      backgroundColor: '#0b092b',
      backgroundImage: `
        linear-gradient(rgba(6, 182, 212, 0.14) 1px, transparent 1px),
        linear-gradient(90deg, rgba(6, 182, 212, 0.14) 1px, transparent 1px),
        linear-gradient(135deg, #0b092b 0%, #170d38 50%, #0c1529 100%)
      `,
      backgroundSize: '32px 32px, 32px 32px, 100% 100%'
    },
    previewStyle: {
      background: 'linear-gradient(135deg, #090d24 0%, #170f3c 100%)',
      backgroundColor: '#090d24'
    },
    cardStyle: {
      background: '#120f30',
      border: '1.5px solid rgba(6, 182, 212, 0.35)',
      boxShadow: '0 16px 40px rgba(6, 182, 212, 0.18)',
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
    animClass: 'theme-anim-cosmic-nebula',
    name: 'Cosmic Nebula',
    tagline: 'Deep space stellar galaxy',
    icon: '🌌',
    accent: '#d946ef',
    bgStyle: {
      backgroundColor: '#09090b',
      backgroundImage: `
        radial-gradient(circle at 20% 75%, rgba(217, 70, 239, 0.28) 0%, transparent 45%),
        radial-gradient(circle at 80% 25%, rgba(99, 102, 241, 0.32) 0%, transparent 45%),
        radial-gradient(ellipse at 50% 15%, #3b0764 0%, #09090b 70%)
      `
    },
    previewStyle: {
      background: 'linear-gradient(135deg, #1b0a2e 0%, #2e0854 100%)',
      backgroundColor: '#1b0a2e'
    },
    cardStyle: {
      background: '#170b28',
      border: '1.5px solid rgba(217, 70, 239, 0.35)',
      boxShadow: '0 16px 40px rgba(217, 70, 239, 0.18)',
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
    animClass: 'theme-anim-retro-synthwave',
    name: 'Retro Synthwave',
    tagline: '80s arcade neon sunset',
    icon: '🌇',
    accent: '#f97316',
    bgStyle: {
      backgroundColor: '#18032e',
      backgroundImage: `
        linear-gradient(0deg, rgba(249, 115, 22, 0.14) 1px, transparent 1px),
        linear-gradient(180deg, #18032e 0%, #3b0764 40%, #831843 75%, #0f021f 100%)
      `,
      backgroundSize: '100% 26px, 100% 100%'
    },
    previewStyle: {
      background: 'linear-gradient(135deg, #240a2e 0%, #4a0d3b 100%)',
      backgroundColor: '#240a2e'
    },
    cardStyle: {
      background: '#230b34',
      border: '1.5px solid rgba(249, 115, 22, 0.4)',
      boxShadow: '0 16px 40px rgba(249, 115, 22, 0.2)',
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
    animClass: 'theme-anim-emerald-matrix',
    name: 'Emerald Matrix',
    tagline: 'Bio-tech digital flow',
    icon: '🌿',
    accent: '#10b981',
    bgStyle: {
      backgroundColor: '#022c22',
      backgroundImage: `
        linear-gradient(rgba(16, 185, 129, 0.14) 1px, transparent 1px),
        linear-gradient(90deg, rgba(16, 185, 129, 0.14) 1px, transparent 1px),
        linear-gradient(135deg, #022c22 0%, #064e3b 50%, #021a14 100%)
      `,
      backgroundSize: '28px 28px, 28px 28px, 100% 100%'
    },
    previewStyle: {
      background: 'linear-gradient(135deg, #022019 0%, #064032 100%)',
      backgroundColor: '#022019'
    },
    cardStyle: {
      background: '#063327',
      border: '1.5px solid rgba(16, 185, 129, 0.35)',
      boxShadow: '0 16px 40px rgba(16, 185, 129, 0.18)',
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
    animClass: 'theme-anim-ocean-abyss',
    name: 'Ocean Abyssal',
    tagline: 'Bioluminescent deep sea trench',
    icon: '🌊',
    accent: '#38bdf8',
    bgStyle: {
      backgroundColor: '#082f49',
      backgroundImage: `
        radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.22) 0%, transparent 60%),
        linear-gradient(135deg, #082f49 0%, #0c4a6e 50%, #020617 100%)
      `
    },
    previewStyle: {
      background: 'linear-gradient(135deg, #062035 0%, #0a3d5c 100%)',
      backgroundColor: '#062035'
    },
    cardStyle: {
      background: '#09253d',
      border: '1.5px solid rgba(56, 189, 248, 0.35)',
      boxShadow: '0 16px 40px rgba(56, 189, 248, 0.18)',
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
    animClass: 'theme-anim-obsidian-zen',
    name: 'Obsidian Zen',
    tagline: 'Minimalist focus mode',
    icon: '🖤',
    accent: '#94a3b8',
    bgStyle: {
      backgroundColor: '#0b0f19',
      backgroundImage: 'linear-gradient(135deg, #0b0f19 0%, #111827 100%)'
    },
    previewStyle: {
      background: 'linear-gradient(135deg, #0b0f19 0%, #1a2234 100%)',
      backgroundColor: '#0b0f19'
    },
    cardStyle: {
      background: '#131b2e',
      border: '1.5px solid #1f2937',
      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55)',
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
