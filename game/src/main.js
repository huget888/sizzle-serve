// Sizzle & Serve — the shell: boots the canvas, runs the loop, owns the
// screens (title, play, pause, results), wires sound to the world's events,
// and stages the screenshot scenes behind ?shot=start|play|rush|end.

import { KitchenAudio } from './audio.js';
import { STEP, VIEW } from './config.js';
import { KitchenInput } from './input.js';
import { SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, render } from './render.js';
import { stageShot } from './shots.js';
import { KitchenWorld } from './world.js';

const BEST_KEY = 'sizzle-serve-best';

function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch { /* best score is a nicety, never a failure */ }
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const input = new KitchenInput(canvas);
const audio = new KitchenAudio();
const world = new KitchenWorld(20261125);

const view = { screen: SCREEN_TITLE, best: loadBest(), frozen: false };
let rushMusic = false;
let lastTime = performance.now();
let accumulator = 0;

/** Play one of the world's sound events. */
function playEvent(event) {
  switch (event) {
    case 'chop': audio.chop(); break;
    case 'pickup': audio.pickup(); break;
    case 'place': audio.place(); break;
    case 'ding': audio.ding(); break;
    case 'coin': audio.coin(); break;
    case 'error': audio.error(); break;
    case 'burn': audio.burn(); break;
    case 'tick': audio.tick(); break;
    default: break;
  }
}

/** Keep the sizzle loop running exactly while something cooks. */
function updateSizzle() {
  const cooking = Object.values(world.slots).some(
    (slot) => slot.item && slot.item.state === 'raw',
  );
  if (cooking) audio.startSizzle();
  else audio.stopSizzle();
}

function startGame() {
  audio.ensure();
  world.reset();
  view.screen = SCREEN_PLAY;
  input.clear();
  audio.startMusic(false);
  rushMusic = false;
}

function endGame() {
  view.screen = SCREEN_OVER;
  audio.stopMusic();
  if (world.score > view.best) {
    view.best = world.score;
    saveBest(world.score);
  }
}

function frame(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (input.takePressed('KeyM')) {
    const muted = audio.toggleMute();
    document.getElementById('status').textContent = muted ? 'Sound off' : 'Sound on';
  }

  if (view.screen === SCREEN_TITLE) {
    if (input.takePressed('Enter')) startGame();
  } else if (view.screen === SCREEN_PLAY) {
    if (input.takePressed('KeyP')) {
      view.screen = SCREEN_PAUSED;
      audio.stopMusic();
    } else {
      accumulator += dt;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const events = world.step(STEP, input);
        for (const event of events) playEvent(event);
        if (world.over) { endGame(); break; }
      }
      if (world.rush !== rushMusic) {
        rushMusic = world.rush;
        audio.setRush(rushMusic);
      }
      updateSizzle();
    }
  } else if (view.screen === SCREEN_PAUSED) {
    if (input.takePressed('KeyP') || input.takePressed('Enter')) {
      view.screen = SCREEN_PLAY;
      audio.startMusic(world.rush);
      rushMusic = world.rush;
    }
  } else if (view.screen === SCREEN_OVER) {
    if (input.takePressed('Enter')) startGame();
  }

  render(ctx, world, view);
  requestAnimationFrame(frame);
}

// A staged screenshot: freeze the world on the named scene and tell the
// driver the frame is ready. The world is not stepped, so the frame is the
// same every run.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  const staged = stageShot(shot, world);
  view.screen = staged.screen;
  view.best = staged.best;
  view.frozen = true;
  render(ctx, world, view);
  window.__shotReady = true;
} else {
  window.__shotReady = false;
  requestAnimationFrame(frame);
}

// The playtest driver reads the live game through this handle.
window.__game = { world, view, input };
