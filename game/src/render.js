// Sizzle & Serve — every pixel the player sees, drawn on one canvas with
// plain 2D shapes: no image files, no fonts to load, nothing over the
// network. The kitchen, the tickets, the chef and the food are all vector
// art, so the game looks the same on any machine.

import { CHEF, CRATES, INGREDIENTS, MAX_TICKETS, STATIONS, VIEW } from './config.js';
import { recipeById } from './world.js';

const FLOOR_A = '#c98d5a';
const FLOOR_B = '#bd7f4e';
const WALL = '#8a5a3b';
const COUNTER = '#e8dcc8';
const COUNTER_DARK = '#b8a888';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', bold = true) {
  ctx.font = `${bold ? '700' : '400'} ${size}px system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

/** One ingredient, drawn as a little dish of food. `state` is raw/ready/burnt. */
export function drawIngredient(ctx, id, state, x, y, r) {
  const def = INGREDIENTS[id];
  if (!def) return;
  const cooked = state === 'ready';
  const burnt = state === 'burnt';
  ctx.save();
  ctx.translate(x, y);
  if (burnt) {
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.3, r * 0.25, 0, Math.PI * 2);
    ctx.arc(r * 0.3, r * 0.2, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  switch (id) {
    case 'bun': {
      ctx.fillStyle = cooked ? '#e8b96a' : '#e8b96a';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.15, r, r * 0.62, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#d99a45';
      roundRect(ctx, -r, -r * 0.15, r * 2, r * 0.35, r * 0.15);
      ctx.fill();
      ctx.fillStyle = '#fff3d6';
      for (const [sx, sy] of [[-0.4, -0.45], [0, -0.6], [0.4, -0.45]]) {
        ctx.beginPath();
        ctx.arc(sx * r, sy * r, r * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'patty': {
      ctx.fillStyle = cooked ? '#7d4522' : '#c98a6b';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
      ctx.fill();
      if (cooked) {
        ctx.strokeStyle = '#5a2f16';
        ctx.lineWidth = 2;
        for (const off of [-0.4, 0, 0.4]) {
          ctx.beginPath();
          ctx.moveTo((off - 0.3) * r, -r * 0.6);
          ctx.lineTo((off + 0.3) * r, r * 0.6);
          ctx.stroke();
        }
      }
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = '#7ec850';
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#4d9c2c';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'tomato': {
      ctx.fillStyle = '#e8483f';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f28b82';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8483f';
      for (let i = 0; i < 3; i += 1) {
        const a = (i / 3) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'pasta': {
      ctx.strokeStyle = cooked ? '#f2d06b' : '#e8c88a';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, r * (0.35 + i * 0.25), 0.3 + i, 4.2 + i);
        ctx.stroke();
      }
      break;
    }
    case 'cheese': {
      ctx.fillStyle = '#f7c948';
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.9, r * 0.6);
      ctx.lineTo(-r * 0.9, r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d9a41f';
      for (const [hx, hy] of [[0, 0.1], [-0.35, 0.35], [0.3, 0.35]]) {
        ctx.beginPath();
        ctx.arc(hx * r, hy * r, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'fish': {
      ctx.fillStyle = cooked ? '#e8b45c' : '#8fc7e8';
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, 0);
      ctx.lineTo(-r * 1.3, -r * 0.5);
      ctx.lineTo(-r * 1.3, r * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2b2b2b';
      ctx.beginPath();
      ctx.arc(r * 0.5, -r * 0.1, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'lemon': {
      ctx.fillStyle = '#f5e663';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9b62a';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7);
        ctx.stroke();
      }
      break;
    }
    case 'potato': {
      if (cooked) {
        // Fries: a little clutch of golden sticks.
        ctx.strokeStyle = '#f2c14e';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i += 1) {
          ctx.beginPath();
          ctx.moveTo(i * r * 0.35, r * 0.7);
          ctx.lineTo(i * r * 0.5, -r * 0.7);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#e8c88a';
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.9, r * 0.7, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#bd9a55';
        for (const [ex, ey] of [[-0.3, -0.1], [0.25, 0.2], [0.1, -0.35]]) {
          ctx.beginPath();
          ctx.arc(ex * r, ey * r, r * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'dough': {
      ctx.fillStyle = cooked ? '#d99a45' : '#f0d9a8';
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      if (cooked) {
        ctx.strokeStyle = '#a67c2e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.7, r * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'berries': {
      ctx.fillStyle = '#c94f7c';
      for (const [bx, by, br] of [[-0.35, 0.25, 0.45], [0.35, 0.3, 0.4], [0, -0.35, 0.45]]) {
        ctx.beginPath();
        ctx.arc(bx * r, by * r, br * r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#8f2a52';
      ctx.beginPath();
      ctx.arc(-r * 0.35, r * 0.15, r * 0.1, 0, Math.PI * 2);
      ctx.arc(r * 0.05, -r * 0.4, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'cream': {
      ctx.fillStyle = '#fdf6ec';
      ctx.beginPath();
      ctx.arc(0, r * 0.25, r * 0.7, Math.PI, 0);
      ctx.arc(r * 0.35, -r * 0.1, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, r * 0.3);
      ctx.quadraticCurveTo(0, -r * 1.1, r * 0.7, r * 0.3);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'mushroom': {
      ctx.fillStyle = cooked ? '#a67c52' : '#d9b48f';
      ctx.beginPath();
      ctx.arc(0, -r * 0.15, r * 0.85, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f5ead6';
      roundRect(ctx, -r * 0.25, -r * 0.15, r * 0.5, r * 0.7, r * 0.2);
      ctx.fill();
      break;
    }
    default:
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
  }
  ctx.restore();
}

function drawProgressBar(ctx, x, y, w, frac, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, x, y, w, 10, 5);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, x + 1, y + 1, Math.max(0, (w - 2) * Math.min(1, frac)), 8, 4);
  ctx.fill();
}

function drawPlate(ctx, x, y, rx, items) {
  ctx.fillStyle = '#f8f4ec';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, rx * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9cbb2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 0.78, rx * 0.32, 0, 0, Math.PI * 2);
  ctx.stroke();
  const n = items.length;
  items.forEach((id, i) => {
    const a = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2;
    const ix = x + Math.cos(a) * rx * 0.45;
    const iy = y + Math.sin(a) * rx * 0.18;
    drawIngredient(ctx, id, 'ready', ix, iy, 13);
  });
}

function drawStation(ctx, world, station) {
  const slot = world.slots[station.id];
  const { x, y, w, h } = station;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const near = world.nearestUsable();
  const isNear = near && near.kind === 'station' && near.station.id === station.id;

  ctx.fillStyle = COUNTER;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = isNear ? '#ffd76a' : COUNTER_DARK;
  ctx.lineWidth = isNear ? 4 : 2;
  roundRect(ctx, x, y, w, h, 10);
  ctx.stroke();

  if (station.kind === 'chop') {
    ctx.fillStyle = '#a9805a';
    roundRect(ctx, x + 14, y + 14, w - 28, h - 28, 8);
    ctx.fill();
    // A little knife, drawn: blade and handle.
    ctx.save();
    ctx.translate(cx, cy - 12);
    ctx.rotate(-0.6);
    ctx.fillStyle = '#dfe3e8';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(16, 2);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6b4226';
    roundRect(ctx, -12, -2, 12, 5, 2);
    ctx.fill();
    ctx.restore();
    if (slot.item) {
      drawIngredient(ctx, slot.item.id, slot.item.state, cx, cy + 6, 16);
      if (slot.item.state === 'raw') drawProgressBar(ctx, x + 16, y + h - 16, w - 32, slot.progress, '#7ec850');
    }
    text(ctx, station.label, cx, y + h + 12, 11, '#f5ead6', 'center');
  } else if (station.kind === 'stove') {
    ctx.fillStyle = '#3d4450';
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#22262e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.stroke();
    if (slot.item) {
      drawIngredient(ctx, slot.item.id, slot.item.state, cx, cy, 17);
      if (slot.item.state === 'raw') {
        drawProgressBar(ctx, x + 16, y + h - 16, w - 32, slot.progress, '#ff9d5c');
      } else if (slot.item.state === 'ready') {
        text(ctx, 'DONE!', cx, y - 10, 13, '#ffd76a');
        drawProgressBar(ctx, x + 16, y + h - 16, w - 32, slot.burnLeft / 5, '#ff6b5e');
      } else {
        text(ctx, 'BURNT!', cx, y - 10, 13, '#ff6b5e');
      }
    } else {
      ctx.fillStyle = '#5a6270';
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
    }
    text(ctx, station.label, cx, y + h + 12, 11, '#f5ead6', 'center');
  } else if (station.kind === 'oven') {
    ctx.fillStyle = '#4a4f5a';
    roundRect(ctx, x + 12, y + 10, w - 24, h - 20, 8);
    ctx.fill();
    ctx.fillStyle = slot.item ? '#ffb347' : '#2b2f38';
    roundRect(ctx, x + 24, y + 20, w - 48, h - 40, 6);
    ctx.fill();
    if (slot.item) {
      drawIngredient(ctx, slot.item.id, slot.item.state, cx, cy, 14);
      if (slot.item.state === 'raw') drawProgressBar(ctx, x + 16, y + h - 16, w - 32, slot.progress, '#ff9d5c');
      else if (slot.item.state === 'ready') text(ctx, 'DONE!', cx, y - 10, 13, '#ffd76a');
      else text(ctx, 'BURNT!', cx, y - 10, 13, '#ff6b5e');
    }
    text(ctx, station.label, cx, y + h + 12, 11, '#f5ead6', 'center');
  } else if (station.kind === 'plate') {
    drawPlate(ctx, cx, cy + 4, 52, slot.items);
    if (slot.items.length > 0) {
      const complete = world.orders.some((o) => {
        const recipe = recipeById(o.recipeId);
        return recipe && slot.items.length === recipe.needs.length;
      });
      if (complete) {
        ctx.strokeStyle = '#ffd76a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 4, 58, 26, 0, 0, Math.PI * 2);
        ctx.stroke();
        text(ctx, 'READY TO SERVE', cx, y - 10, 12, '#ffd76a');
      }
    }
    text(ctx, station.label, cx, y + h + 12, 11, '#f5ead6', 'center');
  } else if (station.kind === 'window') {
    ctx.fillStyle = '#7a4a2b';
    roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a4a2b';
    ctx.fillRect(cx - 2, cy - 18, 4, 8);
    text(ctx, station.label, cx, cy + 20, 12, '#fff');
    text(ctx, station.label, cx, y + h + 12, 11, '#f5ead6', 'center');
  } else if (station.kind === 'trash') {
    ctx.fillStyle = '#5a6270';
    roundRect(ctx, x + 30, y + 10, w - 60, h - 20, 8);
    ctx.fill();
    ctx.fillStyle = '#3d4450';
    roundRect(ctx, x + 24, y + 6, w - 48, 10, 5);
    ctx.fill();
    text(ctx, station.label, cx, y + h + 12, 11, '#f5ead6', 'center');
  }
}

function drawCrate(ctx, world, crate) {
  const { x, y } = crate;
  const near = world.selectedCrate === crate.id;
  ctx.fillStyle = '#8a5a3b';
  roundRect(ctx, x, y, 90, 40, 8);
  ctx.fill();
  ctx.strokeStyle = near ? '#ffd76a' : '#6b4226';
  ctx.lineWidth = near ? 3 : 2;
  roundRect(ctx, x, y, 90, 40, 8);
  ctx.stroke();
  text(ctx, crate.label, x + 45, y - 10, 11, '#f5ead6');
  // The picker's row of items, numbered 1..n, with the selected one lifted.
  crate.items.forEach((id, i) => {
    const ix = x + 14 + i * 13;
    const iy = y + 20 + (world.cratePick[crate.id] === i && near ? -4 : 0);
    drawIngredient(ctx, id, 'raw', ix, iy, 6);
    if (i < 6) text(ctx, String(i + 1), ix, y + 34, 8, '#d9cbb2', 'center', false);
  });
}

function drawChef(ctx, world) {
  const c = world.chef;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + 16, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: white apron, red scarf.
  ctx.fillStyle = '#f5f0e6';
  ctx.beginPath();
  ctx.arc(c.x, c.y, CHEF.radius - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9cbb2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c.x, c.y, CHEF.radius - 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#e8483f';
  ctx.beginPath();
  ctx.arc(c.x, c.y + 4, 8, 0, Math.PI * 2);
  ctx.fill();
  // Head and toque.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(c.x, c.y - 12, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(c.x - 6, c.y - 22, 7, 0, Math.PI * 2);
  ctx.arc(c.x + 6, c.y - 22, 7, 0, Math.PI * 2);
  ctx.arc(c.x, c.y - 26, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(c.x - 10, c.y - 22, 20, 5);
  // Eyes look where the chef walks.
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath();
  ctx.arc(c.x + c.fx * 4 - 4, c.y - 12 + c.fy * 3, 1.8, 0, Math.PI * 2);
  ctx.arc(c.x + c.fx * 4 + 4, c.y - 12 + c.fy * 3, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Carried items ride above the chef's head.
  c.carried.forEach((item, i) => {
    const ix = c.x + (i - (c.carried.length - 1) / 2) * 26;
    const iy = c.y - 44;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(ix, iy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b8a888';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ix, iy, 13, 0, Math.PI * 2);
    ctx.stroke();
    if (item.kind === 'plate') {
      drawPlate(ctx, ix, iy, 11, item.items);
    } else {
      drawIngredient(ctx, item.id, item.state, ix, iy, 9);
    }
  });
}

function drawTickets(ctx, world) {
  const boardX = 260;
  const boardY = 66;
  const cardW = 185;
  const cardH = 48;
  ctx.fillStyle = '#6b4226';
  roundRect(ctx, boardX - 12, boardY - 8, MAX_TICKETS * (cardW + 10) + 2, cardH + 16, 10);
  ctx.fill();
  text(ctx, 'ORDERS', boardX - 12 + 8, boardY + cardH / 2, 12, '#ffd76a', 'left');
  world.orders.forEach((order, i) => {
    const recipe = recipeById(order.recipeId);
    const x = boardX + 64 + i * (cardW + 10);
    const y = boardY;
    const urgent = order.patience < 12;
    ctx.fillStyle = urgent ? '#fff0e0' : '#fffaf0';
    roundRect(ctx, x, y, cardW, cardH, 8);
    ctx.fill();
    ctx.strokeStyle = urgent ? '#ff6b5e' : '#d9cbb2';
    ctx.lineWidth = urgent ? 3 : 1.5;
    roundRect(ctx, x, y, cardW, cardH, 8);
    ctx.stroke();
    text(ctx, recipe.name, x + 8, y + 11, 12, '#3d2b1f', 'left');
    recipe.needs.forEach((id, j) => {
      drawIngredient(ctx, id, 'ready', x + 16 + j * 24, y + 30, 9);
    });
    const frac = Math.max(0, order.patience / order.patienceMax);
    const color = frac > 0.5 ? '#7ec850' : frac > 0.25 ? '#f7c948' : '#ff6b5e';
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, x + 8, y + cardH - 9, cardW - 16, 5, 2);
    ctx.fill();
    ctx.fillStyle = color;
    roundRect(ctx, x + 8, y + cardH - 9, (cardW - 16) * frac, 5, 2);
    ctx.fill();
  });
  for (let i = world.orders.length; i < MAX_TICKETS; i += 1) {
    const x = boardX + 64 + i * (cardW + 10);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, x, boardY, cardW, cardH, 8);
    ctx.fill();
  }
}

function drawHud(ctx, world, view) {
  ctx.fillStyle = '#3d2b1f';
  ctx.fillRect(0, 0, VIEW.width, 58);
  text(ctx, 'SIZZLE & SERVE', 20, 30, 22, '#ffd76a', 'left');
  const total = Math.ceil(world.timeLeft);
  const mm = String(Math.floor(total / 60)).padStart(1, '0');
  const ss = String(total % 60).padStart(2, '0');
  const timerColor = world.timeLeft <= 30 ? '#ff6b5e' : '#ffffff';
  // A little clock face, drawn, then the time.
  ctx.strokeStyle = timerColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(585, 30, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(585, 30);
  ctx.lineTo(585, 21);
  ctx.moveTo(585, 30);
  ctx.lineTo(592, 30);
  ctx.stroke();
  text(ctx, `${mm}:${ss}`, 640, 30, 26, timerColor);
  text(ctx, `★ ${world.score}`, 1060, 30, 22, '#ffffff');
  text(ctx, `Served ${world.served}`, 1180, 22, 14, '#c9e8a8', 'right');
  text(ctx, `Missed ${world.missed}`, 1180, 42, 14, '#ff9d8a', 'right');
  if (world.combo >= 2) {
    text(ctx, `COMBO x${world.combo}`, 940, 30, 18, '#ff9d5c');
  }
  if (world.rush && view.screen === 'play') {
    ctx.fillStyle = 'rgba(255,60,40,0.10)';
    ctx.fillRect(0, 58, VIEW.width, VIEW.height - 58);
    // The rush banner lives at the bottom centre, clear of the ticket board.
    ctx.fillStyle = 'rgba(60,10,5,0.75)';
    roundRect(ctx, 500, 682, 280, 28, 14);
    ctx.fill();
    text(ctx, 'RUSH HOUR — 1.5x POINTS!', 640, 697, 15, '#ff8a7a');
  }
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.min(1, f.life);
    text(ctx, f.text, f.x, f.y, 20, f.color);
  }
  ctx.globalAlpha = 1;
}

function drawKitchen(ctx, world, view) {
  // Wooden floor with a checker of planks.
  for (let y = 0; y < 12; y += 1) {
    for (let x = 0; x < 20; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(x * 64, 58 + y * 56, 64, 56);
    }
  }
  // Tile backsplash along the top wall.
  ctx.fillStyle = '#7fb069';
  ctx.fillRect(0, 58, VIEW.width, 56);
  ctx.fillStyle = '#67995a';
  for (let x = 0; x < 20; x += 1) ctx.fillRect(x * 64 + 2, 60, 60, 26);
  // A rug in the middle of the floor, and potted herbs in the corners, so
  // the kitchen reads as a room and not an empty board.
  ctx.fillStyle = '#a85f3c';
  ctx.beginPath();
  ctx.ellipse(640, 420, 210, 110, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8b96a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(640, 420, 190, 96, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (const [px, py] of [[210, 660], [1070, 300]]) {
    ctx.fillStyle = '#b06a3b';
    ctx.beginPath();
    ctx.moveTo(px - 14, py);
    ctx.lineTo(px + 14, py);
    ctx.lineTo(px + 10, py + 22);
    ctx.lineTo(px - 10, py + 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5da24a';
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI / 2 + (i - 2) * 0.35;
      ctx.beginPath();
      ctx.ellipse(px + Math.cos(a) * 10, py - 8 + Math.sin(a) * 8, 5, 12, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Decorative ingredient piles on the pass counter (bottom centre).
  ctx.fillStyle = COUNTER;
  roundRect(ctx, 660, 600, 170, 60, 10);
  ctx.fill();
  ctx.strokeStyle = COUNTER_DARK;
  ctx.lineWidth = 2;
  roundRect(ctx, 660, 600, 170, 60, 10);
  ctx.stroke();
  text(ctx, 'PASS', 745, 592, 11, '#f5ead6');
  ['tomato', 'lettuce', 'lemon'].forEach((id, i) => drawIngredient(ctx, id, 'ready', 690 + i * 55, 630, 14));
  for (const crate of CRATES) drawCrate(ctx, world, crate);
  for (const station of STATIONS) drawStation(ctx, world, station);
  drawParticles(ctx, world);
  drawChef(ctx, world);
  // Crate picker hint when the chef stands by a crate (above the rush banner).
  if (world.selectedCrate) {
    const crate = CRATES.find((c) => c.id === world.selectedCrate);
    if (crate) {
      text(ctx, 'Press 1-6 or click an item to take it • E takes the highlighted one', 640, 668, 13, '#ffffff');
    }
  }
}

function drawTitle(ctx, world, view) {
  drawKitchen(ctx, world, view);
  ctx.fillStyle = 'rgba(30,18,8,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'SIZZLE & SERVE', 640, 170, 64, '#ffd76a');
  text(ctx, 'a rush-hour kitchen game', 640, 225, 22, '#ffffff');
  text(ctx, 'Take orders • Chop, fry, boil & bake • Plate it • Serve it before the ticket runs out', 640, 290, 18, '#f5ead6');
  text(ctx, 'Move: WASD / arrows / click a station   •   Interact: E or Space (hold E to chop)', 640, 325, 16, '#c9e8a8');
  text(ctx, 'Pantry: press 1-6 to grab an ingredient   •   M mute   •   P pause', 640, 352, 16, '#c9e8a8');
  text(ctx, 'Recipes combine: a burger needs bun + fried patty + chopped lettuce + chopped tomato.', 640, 387, 16, '#f5ead6');
  text(ctx, 'Serve fast for tips — chain serves for a combo. Last 30 seconds: RUSH HOUR, 1.5x points.', 640, 412, 16, '#f5ead6');
  text(ctx, 'Hey judge — every station works, every recipe serves. Have a taste.', 640, 452, 15, '#ffd76a', 'center', false);
  const blink = view.frozen ? true : Math.floor(performance.now() / 500) % 2 === 0;
  if (blink) text(ctx, 'PRESS ENTER TO START', 640, 530, 26, '#ffffff');
  if (view.best > 0) text(ctx, `Best score: ${view.best}`, 640, 580, 18, '#ffd76a');
}

function drawResults(ctx, world, view) {
  drawKitchen(ctx, world, view);
  ctx.fillStyle = 'rgba(30,18,8,0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'SHIFT OVER!', 640, 180, 56, '#ffd76a');
  text(ctx, `You served ${world.served} dishes and missed ${world.missed}.`, 640, 250, 22, '#ffffff');
  text(ctx, `Score: ${world.score}`, 640, 300, 30, '#ffffff');
  text(ctx, `Best combo: x${world.bestCombo}`, 640, 340, 20, '#ff9d5c');
  if (world.score >= view.best && world.score > 0) text(ctx, 'NEW BEST SCORE!', 640, 380, 22, '#7ec850');
  else if (view.best > 0) text(ctx, `Best score: ${view.best}`, 640, 380, 20, '#ffd76a');
  const blink = view.frozen ? true : Math.floor(performance.now() / 500) % 2 === 0;
  if (blink) text(ctx, 'PRESS ENTER TO PLAY AGAIN', 640, 470, 24, '#ffffff');
}

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';
export const SCREEN_PAUSED = 'paused';

/** Draw one frame. `view` carries the screen and the best score. */
export function render(ctx, world, view) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  if (view.screen === SCREEN_TITLE) drawTitle(ctx, world, view);
  else if (view.screen === SCREEN_OVER) drawResults(ctx, world, view);
  else {
    drawKitchen(ctx, world, view);
    // The ticket board and the HUD sit above the kitchen, never beneath it.
    drawTickets(ctx, world);
    drawHud(ctx, world, view);
    if (view.screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(30,18,8,0.6)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      text(ctx, 'PAUSED', 640, 330, 48, '#ffffff');
      text(ctx, 'Press P to resume', 640, 390, 20, '#f5ead6');
    }
  }
}
