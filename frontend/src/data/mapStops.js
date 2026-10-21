// Stops on the quest map. x/y are positions on the 1100 x 440 map canvas and
// should sit on the SVG path below. status: done | current | locked.
// In production, derive `status` and `note` from the learner's assigned quests.

export const MAP_WIDTH = 1100;
export const MAP_HEIGHT = 440;

export const MAP_PATH =
  'M60 360 C220 360 220 150 380 170 S560 360 700 300 S900 80 1040 120';

// Share of the path that is lit up (0-100).
export const MAP_PROGRESS = 58;

export const MAP_STOPS = [
  { id: 'orientation', title: 'Orientation', note: 'CLEARED', x: 60, y: 360, status: 'done' },
  { id: 'infosec', title: 'Information Security', note: '94% ACCURACY', x: 220, y: 258, status: 'done' },
  { id: 'access', title: 'Access Control', note: '100% ACCURACY', x: 380, y: 170, status: 'done' },
  { id: 'privacy', title: 'Privacy Management', note: '88% ACCURACY', x: 548, y: 265, status: 'done' },
  { id: 'database', title: 'Database Security', note: 'DUE IN 3 DAYS', x: 700, y: 300, status: 'current' },
  { id: 'assessment', title: 'Final Assessment', note: 'LOCKED', x: 870, y: 172, status: 'locked', icon: 'lock' },
  { id: 'certified', title: 'Certified', note: 'LOCKED', x: 1040, y: 120, status: 'locked', icon: 'trophy', goal: true },
];
