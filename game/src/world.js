// Sizzle & Serve — the kitchen itself: the chef, the orders, the stations,
// the shift timer and the score. No drawing here, no sound here: step() takes
// input and time, and returns the list of sound events the step caused, so
// the shell can play them and the playtest can read them.

import {
  CHEF, CRATES, HAND_SLOTS, INGREDIENTS, MAX_TICKETS, PACING, RECIPES,
  SCORING, SHIFT_SECONDS, STATIONS, VIEW, WALLS,
} from './config.js';
import { makeRng, pick } from './random.js';

let nextOrderId = 1;

/** True when two ingredient lists hold the same items, order aside. */
export function sameItems(a, b) {
  if (a.length !== b.length) return false;
  const rest = [...b];
  for (const item of a) {
    const at = rest.indexOf(item);
    if (at === -1) return false;
    rest.splice(at, 1);
  }
  return true;
}

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id);
}

/** The ticket for a recipe: its patience counts down while it waits. */
function makeTicket(rng, elapsed) {
  const unlocked = RECIPES.filter((r) => r.unlock <= elapsed);
  const recipe = pick(rng, unlocked);
  const t = elapsed / SHIFT_SECONDS;
  const patience = PACING.patienceStart + (PACING.patienceEnd - PACING.patienceStart) * t;
  return { id: nextOrderId, recipeId: recipe.id, patience, patienceMax: patience, born: elapsed };
}

export class KitchenWorld {
  constructor(seed = 1) {
    this.seed = seed;
    this.rng = makeRng(seed);
    this.reset();
  }

  reset() {
    this.time = 0;
    this.score = 0;
    this.served = 0;
    this.missed = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.spawnTimer = 6;
    this.rush = false;
    this.over = false;
    this.events = [];
    this.chef = {
      x: CHEF.startX, y: CHEF.startY, fx: 0, fy: -1,
      carried: [], // {kind:'ingredient', id, state} or {kind:'plate', items:[...]}
      moveTarget: null, pendingStation: null, pendingItem: null,
    };
    this.orders = [];
    this.particles = [];
    this.floaters = [];
    this.selectedCrate = null; // crate id the chef stands by, for its picker
    this.cratePick = {}; // crate id -> selected item index
    for (const crate of CRATES) this.cratePick[crate.id] = 0;
    // Runtime slots per station.
    this.slots = {};
    for (const station of STATIONS) {
      if (station.kind === 'chop') this.slots[station.id] = { item: null, progress: 0 };
      else if (station.kind === 'stove') this.slots[station.id] = { item: null, progress: 0, done: false, burnLeft: 0 };
      else if (station.kind === 'oven') this.slots[station.id] = { item: null, progress: 0, done: false, burnLeft: 0 };
      else if (station.kind === 'plate') this.slots[station.id] = { items: [] };
      else this.slots[station.id] = {};
    }
    this.chopping = null; // station id the chef is holding E on
    this.lastTickSecond = -1;
  }

  get timeLeft() { return Math.max(0, SHIFT_SECONDS - this.time); }
  get carryingPlate() { return this.chef.carried.find((c) => c.kind === 'plate') ?? null; }
  get handCount() { return this.chef.carried.length; }
  get handFull() { return this.carryingPlate !== null || this.chef.carried.length >= HAND_SLOTS; }

  /** The station whose rectangle the point is in, or null. */
  stationAt(x, y) {
    for (const s of STATIONS) {
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s;
    }
    return null;
  }

  /** The crate whose rectangle the point is in, or null. */
  crateAt(x, y) {
    for (const c of CRATES) {
      if (x >= c.x - 10 && x <= c.x + 100 && y >= c.y - 10 && y <= c.y + 50) return c;
    }
    return null;
  }

  /** The nearest station or crate within reach of the chef. */
  nearestUsable() {
    const { x, y } = this.chef;
    let best = null;
    let bestD = 78;
    for (const s of STATIONS) {
      const cx = Math.max(s.x, Math.min(x, s.x + s.w));
      const cy = Math.max(s.y, Math.min(y, s.y + s.h));
      const d = Math.hypot(x - cx, y - cy);
      if (d < bestD) { bestD = d; best = { kind: 'station', station: s }; }
    }
    for (const c of CRATES) {
      const cx = Math.max(c.x, Math.min(x, c.x + 90));
      const cy = Math.max(c.y, Math.min(y, c.y + 40));
      const d = Math.hypot(x - cx, y - cy);
      if (d < bestD) { bestD = d; best = { kind: 'crate', crate: c }; }
    }
    return best;
  }

  /** Move the chef, colliding with walls; returns true when it moved. */
  moveChef(dx, dy, dt) {
    const c = this.chef;
    let moved = false;
    const nx = c.x + dx * CHEF.speed * dt;
    if (!this.hitsWall(nx, c.y)) { c.x = nx; moved = true; }
    const ny = c.y + dy * CHEF.speed * dt;
    if (!this.hitsWall(c.x, ny)) { c.y = ny; moved = true; }
    c.x = Math.max(150, Math.min(VIEW.width - 40, c.x));
    c.y = Math.max(210, Math.min(VIEW.height - 40, c.y));
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      c.fx = dx / len;
      c.fy = dy / len;
    }
    return moved;
  }

  hitsWall(x, y) {
    for (const w of WALLS) {
      const cx = Math.max(w.x, Math.min(x, w.x + w.w));
      const cy = Math.max(w.y, Math.min(y, w.y + w.h));
      if (Math.hypot(x - cx, y - cy) < CHEF.radius) return true;
    }
    return false;
  }

  addParticles(x, y, color, count, speed = 60) {
    for (let i = 0; i < count; i += 1) {
      const a = this.rng() * Math.PI * 2;
      const v = speed * (0.4 + this.rng() * 0.8);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.5 + this.rng() * 0.4, max: 0.9, color, size: 2 + this.rng() * 3 });
    }
  }

  addFloater(x, y, text, color) {
    this.floaters.push({ x, y, text, life: 1.2, color });
  }

  /** Take an ingredient from a crate into a free hand. An ingredient with
   * no prep step (bun, berries, cream) is ready to plate the moment it is
   * taken; the rest start raw and need their station. */
  takeFromCrate(crate, itemIndex) {
    if (this.handFull) return false;
    const items = crate.items;
    const id = items[itemIndex % items.length];
    const state = INGREDIENTS[id].prep === null ? 'ready' : 'raw';
    this.chef.carried.push({ kind: 'ingredient', id, state });
    this.cratePick[crate.id] = (itemIndex + 1) % items.length;
    this.events.push('pickup');
    return true;
  }

  /** The chef's first carried raw ingredient with the given prep, if any. */
  carriedRaw(prep) {
    return this.chef.carried.findIndex((c) => c.kind === 'ingredient' && c.state === 'raw' && INGREDIENTS[c.id].prep === prep);
  }

  /** The chef's first carried ready ingredient, if any. */
  carriedReady() {
    return this.chef.carried.findIndex((c) => c.kind === 'ingredient' && c.state === 'ready');
  }

  removeCarried(index) {
    return this.chef.carried.splice(index, 1)[0];
  }

  /** One press of the interact key near the nearest usable thing. */
  interact() {
    const near = this.nearestUsable();
    if (!near) return;
    if (near.kind === 'crate') {
      this.selectedCrate = near.crate.id;
      this.takeFromCrate(near.crate, this.cratePick[near.crate.id]);
      return;
    }
    const station = near.station;
    const slot = this.slots[station.id];
    if (station.kind === 'chop') this.interactChop(station, slot);
    else if (station.kind === 'stove' || station.kind === 'oven') this.interactCooker(station, slot);
    else if (station.kind === 'plate') this.interactPlate(station, slot);
    else if (station.kind === 'window') this.interactWindow(station);
    else if (station.kind === 'trash') this.interactTrash();
  }

  interactChop(station, slot) {
    // A finished chop jumps to a free hand; otherwise take it with E.
    if (slot.item && slot.item.state === 'ready') {
      if (!this.handFull) {
        this.chef.carried.push(slot.item);
        slot.item = null;
        slot.progress = 0;
        this.events.push('pickup');
      }
      return;
    }
    if (slot.item) return; // still chopping: hold E instead
    const at = this.carriedRaw('chop');
    if (at === -1) return;
    slot.item = this.removeCarried(at);
    slot.progress = 0;
    this.events.push('place');
  }

  interactCooker(station, slot) {
    if (slot.item && slot.item.state === 'ready') {
      if (!this.handFull) {
        this.chef.carried.push(slot.item);
        slot.item = null;
        slot.progress = 0;
        slot.done = false;
        this.events.push('pickup');
      }
      return;
    }
    if (slot.item && slot.item.state === 'burnt') {
      if (!this.handFull) {
        this.chef.carried.push(slot.item);
        slot.item = null;
        slot.progress = 0;
        slot.done = false;
        this.events.push('pickup');
      }
      return;
    }
    if (slot.item) return; // cooking
    const prep = station.kind === 'oven' ? 'bake' : null;
    let at = -1;
    if (prep) at = this.carriedRaw('bake');
    else {
      at = this.chef.carried.findIndex((c) => c.kind === 'ingredient' && c.state === 'raw' && (INGREDIENTS[c.id].prep === 'fry' || INGREDIENTS[c.id].prep === 'boil'));
    }
    if (at === -1) return;
    slot.item = this.removeCarried(at);
    slot.progress = 0;
    slot.done = false;
    this.events.push('place');
  }

  interactPlate(station, slot) {
    const plate = this.carryingPlate;
    if (plate) {
      // Put the carried plate back down on an empty plate slot.
      if (slot.items.length === 0) {
        slot.items = plate.items;
        this.chef.carried = this.chef.carried.filter((c) => c !== plate);
        this.events.push('place');
      }
      return;
    }
    const readyAt = this.carriedReady();
    if (readyAt !== -1) {
      const item = this.removeCarried(readyAt);
      slot.items.push(item.id);
      this.events.push('place');
      this.addParticles(station.x + station.w / 2, station.y + station.h / 2, '#ffd76a', 6, 40);
      return;
    }
    // Empty hands and a plate here: pick the plate up.
    if (slot.items.length > 0) {
      const items = slot.items;
      slot.items = [];
      this.chef.carried.push({ kind: 'plate', items });
      this.events.push('pickup');
    }
  }

  interactWindow() {
    const plate = this.carryingPlate;
    if (!plate) return;
    const match = this.orders.find((o) => sameItems(plate.items, recipeById(o.recipeId).needs));
    const wx = 1115;
    const wy = 625;
    if (match) {
      const recipe = recipeById(match.recipeId);
      const tip = Math.round((match.patience / match.patienceMax) * SCORING.tipMax);
      let points = recipe.base + tip + this.combo * SCORING.comboStep;
      if (this.rush) points = Math.round(points * 1.5);
      this.score += points;
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.served += 1;
      this.orders = this.orders.filter((o) => o !== match);
      this.chef.carried = this.chef.carried.filter((c) => c !== plate);
      this.events.push('ding');
      this.events.push('coin');
      this.addFloater(wx, wy - 20, `+${points}`, '#ffd76a');
      this.addParticles(wx, wy, '#ffd76a', 14, 90);
      if (this.combo >= 3) this.addFloater(wx, wy - 48, `COMBO x${this.combo}`, '#ff9d5c');
    } else {
      this.score += SCORING.wrongDish;
      this.combo = 0;
      this.chef.carried = this.chef.carried.filter((c) => c !== plate);
      this.events.push('error');
      this.addFloater(wx, wy - 20, `Wrong dish! +${SCORING.wrongDish}`, '#ff6b5e');
    }
  }

  interactTrash() {
    if (this.chef.carried.length === 0) return;
    this.chef.carried = [];
    this.events.push('place');
    this.addParticles(this.chef.x, this.chef.y + 20, '#9aa0a6', 8, 50);
  }

  /** Holding the interact key: chopping progresses on the board in reach. */
  holdInteract(dt) {
    const near = this.nearestUsable();
    if (!near || near.kind !== 'station' || near.station.kind !== 'chop') { this.chopping = null; return; }
    const slot = this.slots[near.station.id];
    if (!slot.item || slot.item.state !== 'raw') { this.chopping = null; return; }
    this.chopping = near.station.id;
    const def = INGREDIENTS[slot.item.id];
    slot.progress += dt / def.prepSeconds;
    if (Math.random() < dt * 6) {
      this.events.push('chop');
      this.addParticles(near.station.x + near.station.w / 2, near.station.y + near.station.h / 2, def.color, 3, 50);
    }
    if (slot.progress >= 1) {
      slot.item.state = 'ready';
      slot.progress = 0;
      this.events.push('ding');
      this.addParticles(near.station.x + near.station.w / 2, near.station.y + near.station.h / 2, '#7ec850', 8, 60);
    }
  }

  /** One fixed step of the world. Returns this step's sound events. */
  step(dt, input) {
    this.events = [];
    if (this.over) return this.events;
    this.time += dt;
    if (this.time >= SHIFT_SECONDS) {
      this.time = SHIFT_SECONDS;
      this.over = true;
      this.events.push('ding');
      return this.events;
    }
    this.rush = this.timeLeft <= 30;
    const t = this.time / SHIFT_SECONDS;

    // New tickets arrive faster as the shift wears on.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.orders.length < MAX_TICKETS) {
      this.orders.push(makeTicket(this.rng, this.time));
      this.spawnTimer = PACING.spawnStart + (PACING.spawnEnd - PACING.spawnStart) * t;
      this.events.push('tick');
    }

    // Patience runs out: the ticket leaves, the combo breaks.
    for (const order of [...this.orders]) {
      order.patience -= dt;
      if (order.patience <= 0) {
        this.orders = this.orders.filter((o) => o !== order);
        this.missed += 1;
        this.combo = 0;
        this.events.push('error');
        this.addFloater(640, 260, `Missed ${recipeById(order.recipeId).name}!`, '#ff6b5e');
      }
    }

    // Cooking progresses; a finished item turns ready, then burns if it
    // waits too long.
    for (const station of STATIONS) {
      if (station.kind !== 'stove' && station.kind !== 'oven') continue;
      const slot = this.slots[station.id];
      if (!slot.item) continue;
      if (slot.item.state === 'raw') {
        const def = INGREDIENTS[slot.item.id];
        slot.progress += dt / def.prepSeconds;
        if (slot.progress >= 1) {
          slot.item.state = 'ready';
          slot.done = true;
          slot.burnLeft = PACING.burnSeconds;
          this.events.push('ding');
        }
      } else if (slot.item.state === 'ready' && slot.done) {
        slot.burnLeft -= dt;
        if (slot.burnLeft <= 0) {
          slot.item.state = 'burnt';
          slot.done = false;
          this.events.push('burn');
          this.addParticles(station.x + station.w / 2, station.y + 10, '#5a5a5a', 10, 40);
        }
      }
    }

    // The last five seconds tick out loud.
    const second = Math.ceil(this.timeLeft);
    if (second <= 5 && second !== this.lastTickSecond) {
      this.lastTickSecond = second;
      this.events.push('tick');
    }

    // Movement: keys first; a click sets a walk target instead.
    const click = input.takeClick();
    if (click) {
      const station = this.stationAt(click.x, click.y) ?? this.crateAt(click.x, click.y);
      if (station) {
        // Walk to a point beside the station, on the side the chef can
        // actually stand: below a top-row station, above a bottom-row one,
        // and to the right of a pantry crate. (The floor below the bottom
        // row is walled off, so a target there would deadlock the chef.)
        let tx;
        let ty;
        if (station.items) {
          // A crate: stand to its right, on the walkable floor (the chef
          // cannot walk above y=210, so the veg crate's target is clamped).
          tx = station.x + 150;
          ty = Math.max(station.y + 20, 215);
        } else if (station.y > 400) {
          tx = station.x + station.w / 2;
          ty = station.y - 55;
        } else {
          tx = station.x + station.w / 2;
          ty = station.y + station.h + 55;
        }
        this.chef.moveTarget = { x: tx, y: ty };
        this.chef.pendingStation = station;
        this.chef.pendingItem = null;
      } else {
        this.chef.moveTarget = { x: click.x, y: click.y };
        this.chef.pendingStation = null;
      }
    }
    const mv = input.moveVector();
    if (mv.x !== 0 || mv.y !== 0) {
      this.chef.moveTarget = null;
      this.chef.pendingStation = null;
      this.moveChef(mv.x, mv.y, dt);
    } else if (this.chef.moveTarget) {
      const dx = this.chef.moveTarget.x - this.chef.x;
      const dy = this.chef.moveTarget.y - this.chef.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 14) {
        this.chef.moveTarget = null;
        if (this.chef.pendingStation) {
          const pending = this.chef.pendingStation;
          this.chef.pendingStation = null;
          // Walked to a station by click: interact on arrival.
          this.interactStationByRef(pending);
        }
      } else {
        this.moveChef(dx / dist, dy / dist, dt);
      }
    }

    // Number keys pick an ingredient from the crate in reach; E interacts.
    const near = this.nearestUsable();
    this.selectedCrate = near && near.kind === 'crate' ? near.crate.id : null;
    if (near && near.kind === 'crate') {
      for (let n = 0; n < 6; n += 1) {
        if (input.takePressed(`Digit${n + 1}`) && n < near.crate.items.length) {
          this.takeFromCrate(near.crate, n);
        }
      }
    }
    if (input.takePressed('KeyE') || input.takePressed('Space')) this.interact();
    const holding = input.keys.has('KeyE') || input.keys.has('Space');
    if (holding) this.holdInteract(dt);
    else this.chopping = null;

    // Particles and floaters age.
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 140 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) { f.y -= 30 * dt; f.life -= dt; }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    return this.events;
  }

  /** Interact with a station the chef walked to by click. */
  interactStationByRef(ref) {
    if (ref.items) {
      // A crate: take its selected item.
      this.takeFromCrate(ref, this.cratePick[ref.id]);
      return;
    }
    const slot = this.slots[ref.id];
    if (!slot) return;
    if (ref.kind === 'chop') this.interactChop(ref, slot);
    else if (ref.kind === 'stove' || ref.kind === 'oven') this.interactCooker(ref, slot);
    else if (ref.kind === 'plate') this.interactPlate(ref, slot);
    else if (ref.kind === 'window') this.interactWindow(ref);
    else if (ref.kind === 'trash') this.interactTrash();
  }
}
