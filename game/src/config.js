// Sizzle & Serve — configuration: canvas, kitchen layout, ingredients, recipes.
// Everything the world and the renderer need, in one place, so tuning the game
// never means hunting through logic.

export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const SHIFT_SECONDS = 150;
export const RUSH_SECONDS = 30;
export const MAX_TICKETS = 4;
export const HAND_SLOTS = 2;

// The chef's walk speed in pixels per second, and the radius used for station
// reach and collisions.
export const CHEF = { speed: 250, radius: 20, startX: 640, startY: 560 };

// One ingredient: how it is stored, what station (if any) turns it into its
// ready form, and how long that takes. `ready` means it can go on a plate.
export const INGREDIENTS = {
  bun: { name: 'Bun', color: '#e8b96a', dark: '#c98f3d', prep: null, prepSeconds: 0, from: 'bakery' },
  patty: { name: 'Patty', color: '#b06a3b', dark: '#7d4522', prep: 'fry', prepSeconds: 4, from: 'meat' },
  lettuce: { name: 'Lettuce', color: '#7ec850', dark: '#4d9c2c', prep: 'chop', prepSeconds: 1.4, from: 'veg' },
  tomato: { name: 'Tomato', color: '#e8483f', dark: '#b02a24', prep: 'chop', prepSeconds: 1.4, from: 'veg' },
  pasta: { name: 'Pasta', color: '#f2d06b', dark: '#c9a13a', prep: 'boil', prepSeconds: 5, from: 'bakery' },
  cheese: { name: 'Cheese', color: '#f7c948', dark: '#d9a41f', prep: 'chop', prepSeconds: 1.2, from: 'dairy' },
  fish: { name: 'Fish', color: '#8fc7e8', dark: '#4d8fb5', prep: 'fry', prepSeconds: 4, from: 'meat' },
  lemon: { name: 'Lemon', color: '#f5e663', dark: '#c9b62a', prep: 'chop', prepSeconds: 1.2, from: 'veg' },
  potato: { name: 'Potato', color: '#e8c88a', dark: '#bd9a55', prep: 'fry', prepSeconds: 4, from: 'veg' },
  dough: { name: 'Dough', color: '#f0d9a8', dark: '#c9a86f', prep: 'bake', prepSeconds: 5, from: 'bakery' },
  berries: { name: 'Berries', color: '#c94f7c', dark: '#9c2f5b', prep: null, prepSeconds: 0, from: 'veg' },
  cream: { name: 'Cream', color: '#fdf6ec', dark: '#d9cbb2', prep: null, prepSeconds: 0, from: 'dairy' },
  mushroom: { name: 'Mushroom', color: '#d9b48f', dark: '#a67c52', prep: 'fry', prepSeconds: 3.5, from: 'veg' },
};

// A recipe is the list of ready-form ingredients a plate must hold. `unlock`
// is the shift second it starts appearing on tickets.
export const RECIPES = [
  { id: 'burger', name: 'Sunny Burger', needs: ['bun', 'patty', 'lettuce', 'tomato'], unlock: 0, base: 20 },
  { id: 'pasta', name: 'Garden Pasta', needs: ['pasta', 'tomato', 'cheese'], unlock: 0, base: 18 },
  { id: 'fish', name: 'Crispy Fish', needs: ['fish', 'lemon', 'potato'], unlock: 20, base: 22 },
  { id: 'tart', name: 'Berry Tart', needs: ['dough', 'berries', 'cream'], unlock: 35, base: 22 },
  { id: 'melt', name: 'Mushroom Melt', needs: ['bun', 'mushroom', 'cheese'], unlock: 60, base: 20 },
];

// Pantry crates: which ingredients each crate hands out. The chef takes from
// a crate by standing beside it and pressing the interact key.
export const CRATES = [
  { id: 'veg', label: 'VEG', x: 60, y: 150, items: ['lettuce', 'tomato', 'lemon', 'potato', 'berries', 'mushroom'] },
  { id: 'meat', label: 'MEAT', x: 60, y: 300, items: ['patty', 'fish'] },
  { id: 'bakery', label: 'BAKERY', x: 60, y: 450, items: ['bun', 'pasta', 'dough'] },
  { id: 'dairy', label: 'DAIRY', x: 60, y: 580, items: ['cheese', 'cream'] },
];

// Stations. Each has a rectangle, a kind, and slots for work in progress.
// chop: two boards, each holds one choppable item and a progress value.
// stove: two burners, fry or boil depending on the item; each holds one item,
// a cook progress, and a burn timer once done.
// oven: one slot, bakes.
// plate: two plates, each a list of ready ingredients.
// window: the serving hatch on the right wall.
// trash: dumps whatever the chef carries (or a burnt item).
export const STATIONS = [
  { id: 'board1', kind: 'chop', label: 'CHOP', x: 300, y: 120, w: 150, h: 70 },
  { id: 'board2', kind: 'chop', label: 'CHOP', x: 470, y: 120, w: 150, h: 70 },
  { id: 'stove1', kind: 'stove', label: 'STOVE', x: 680, y: 120, w: 150, h: 70 },
  { id: 'stove2', kind: 'stove', label: 'STOVE', x: 850, y: 120, w: 150, h: 70 },
  { id: 'oven', kind: 'oven', label: 'OVEN', x: 1040, y: 120, w: 150, h: 70 },
  { id: 'plate1', kind: 'plate', label: 'PLATE', x: 300, y: 590, w: 150, h: 70 },
  { id: 'plate2', kind: 'plate', label: 'PLATE', x: 470, y: 590, w: 150, h: 70 },
  { id: 'window', kind: 'window', label: 'SERVE', x: 1040, y: 590, w: 150, h: 70 },
  { id: 'trash', kind: 'trash', label: 'TRASH', x: 850, y: 590, w: 150, h: 70 },
];

// Counters the chef cannot walk through (the crates on the left wall and the
// station blocks). The floor the chef roams is the middle of the kitchen.
export const WALLS = [
  { x: 40, y: 120, w: 90, h: 560 }, // pantry crates
  ...STATIONS.map((s) => ({ x: s.x - 8, y: s.y - 8, w: s.w + 16, h: s.h + 16 })),
];

// Order pacing: seconds between new tickets, and ticket patience, at the
// start of the shift and at the end (the rush). They lerp between the two.
export const PACING = {
  spawnStart: 13, spawnEnd: 7,
  patienceStart: 48, patienceEnd: 30,
  burnSeconds: 5, // how long a cooked item waits before it burns
};

// Scoring: a served dish pays its base plus a tip for patience left, plus a
// combo bonus. A wrong dish pays a pittance and breaks the combo.
export const SCORING = { tipMax: 15, comboStep: 2, wrongDish: 5, missPenalty: 0 };
