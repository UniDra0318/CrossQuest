// The four quest tracks. `color` is the AA-safe header color, `dot` the brighter
// swatch used on dark/light strips, `right`/`top` shade the 3D cube sides.
export const TRACKS = {
  infosec: {
    name: 'Information Security',
    color: '#1d6fe0',
    dot: '#1d6fe0',
    right: '#9cc3f5',
    top: '#d6e6fb',
    icon: 'shield',
    face: { label: 'INFOSEC', bg: '#1d6fe0', fg: '#fff' },
  },
  access: {
    name: 'Access Control',
    color: '#087a54',
    dot: '#10b981',
    right: '#8fd9bd',
    top: '#cff0e3',
    icon: 'lock',
    face: { label: 'ACCESS', bg: '#10b981', fg: '#17102b' },
  },
  privacy: {
    name: 'Privacy Management',
    color: '#d12a43',
    dot: '#e5384f',
    right: '#f2a0ae',
    top: '#fad3da',
    icon: 'eye',
    face: { label: 'PRIVACY', bg: '#e5384f', fg: '#fff' },
  },
  database: {
    name: 'Database Security',
    color: '#6a2bd9',
    dot: '#6a2bd9',
    right: '#b79af2',
    top: '#dcccf9',
    icon: 'database',
    face: { label: 'DATA', bg: '#6a2bd9', fg: '#fff' },
  },
};

// Faces for the spinning cube: four tracks + XP + BADGE.
export const CUBE_FACES = [
  TRACKS.infosec.face,
  TRACKS.access.face,
  TRACKS.privacy.face,
  TRACKS.database.face,
  { label: 'XP', bg: '#ff7a1a', fg: '#17102b' },
  { label: 'BADGE', bg: '#ffc53d', fg: '#17102b' },
];
