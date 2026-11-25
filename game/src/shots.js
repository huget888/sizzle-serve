// Sizzle & Serve — the screenshot scenes behind ?shot=start|play|rush|end.
// Each scene sets the world to a state a real shift reaches (orders on the
// board, a dish half-built on a plate, the chef mid-chop, a finished plate
// ready to serve), then the real renderer draws it, so every screenshot is
// the game itself at its most complete — and the same seed always gives the
// same frame.

import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function ticket(id, recipeId, patience) {
  return { id, recipeId, patience, patienceMax: patience, born: 0 };
}

function stageStart(world) {
  world.reset();
  world.orders = [ticket(1, 'burger', 42), ticket(2, 'pasta', 38)];
  world.time = 4;
  return { screen: SCREEN_TITLE, best: 0 };
}

function stagePlay(world) {
  world.reset();
  world.time = 65;
  world.score = 145;
  world.served = 5;
  world.combo = 3;
  world.bestCombo = 4;
  world.orders = [
    ticket(1, 'burger', 38),
    ticket(2, 'pasta', 24),
    ticket(3, 'fish', 14),
  ];
  // A burger half-built on plate 1, a finished one on plate 2, ready to serve.
  world.slots.plate1.items = ['bun', 'patty'];
  world.slots.plate2.items = ['bun', 'patty', 'lettuce', 'tomato'];
  // A patty frying on stove 1, pasta boiling on stove 2, dough in the oven.
  world.slots.stove1.item = { kind: 'ingredient', id: 'patty', state: 'raw' };
  world.slots.stove1.progress = 0.6;
  world.slots.stove2.item = { kind: 'ingredient', id: 'pasta', state: 'raw' };
  world.slots.stove2.progress = 0.4;
  world.slots.oven.item = { kind: 'ingredient', id: 'dough', state: 'raw' };
  world.slots.oven.progress = 0.75;
  // The chef stands at the first chopping board, a tomato half-chopped.
  world.chef.x = 375;
  world.chef.y = 215;
  world.chef.fx = 0;
  world.chef.fy = -1;
  world.chef.carried = [{ kind: 'ingredient', id: 'tomato', state: 'raw' }];
  world.slots.board1.item = { kind: 'ingredient', id: 'lettuce', state: 'raw' };
  world.slots.board1.progress = 0.6;
  world.chopping = 'board1';
  return { screen: SCREEN_PLAY, best: 145 };
}

function stageRush(world) {
  world.reset();
  world.time = 125;
  world.score = 320;
  world.served = 11;
  world.missed = 1;
  world.combo = 5;
  world.bestCombo = 5;
  world.rush = true;
  world.orders = [
    ticket(1, 'burger', 9),
    ticket(2, 'tart', 22),
    ticket(3, 'fish', 16),
    ticket(4, 'melt', 28),
  ];
  world.slots.stove1.item = { kind: 'ingredient', id: 'fish', state: 'raw' };
  world.slots.stove1.progress = 0.8;
  world.slots.stove2.item = { kind: 'ingredient', id: 'patty', state: 'ready' };
  world.slots.stove2.done = true;
  world.slots.stove2.burnLeft = 3;
  world.slots.plate1.items = ['dough', 'berries'];
  // The chef hurries a finished mushroom melt to the serving window.
  world.chef.x = 1050;
  world.chef.y = 545;
  world.chef.fx = 1;
  world.chef.fy = 0;
  world.chef.carried = [{ kind: 'plate', items: ['bun', 'mushroom', 'cheese'] }];
  return { screen: SCREEN_PLAY, best: 320 };
}

function stageEnd(world) {
  world.reset();
  world.time = 150;
  world.over = true;
  world.score = 410;
  world.served = 12;
  world.missed = 2;
  world.combo = 0;
  world.bestCombo = 6;
  return { screen: SCREEN_OVER, best: 410 };
}

/**
 * Set `world` to the named scene (start, play, rush or end; any other name
 * is start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  if (name === 'play') return stagePlay(world);
  if (name === 'rush') return stageRush(world);
  if (name === 'end') return stageEnd(world);
  return stageStart(world);
}
