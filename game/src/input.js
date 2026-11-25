// Sizzle & Serve — keyboard and mouse input. WASD or arrows walk the chef,
// E or Space interacts with whatever station is in reach, and a mouse click
// on a station walks the chef there and interacts on arrival, so the game
// plays with keyboard alone, mouse alone, or both at once.

export class KitchenInput {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.click = null; // {x, y} in canvas pixels, consumed by the world
    this.canvas = canvas;

    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.pressed.clear(); });
    canvas.addEventListener('pointerdown', (event) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.click = { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
    });
  }

  /** The walk direction from the held keys: {x, y} each -1, 0 or 1. */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x, y };
  }

  /** True once for each press of the interact key, until the world reads it. */
  interactPressed() {
    const hit = this.pressed.has('KeyE') || this.pressed.has('Space');
    this.pressed.delete('KeyE');
    this.pressed.delete('Space');
    return hit;
  }

  /** True once for each press of the given code, until read. */
  takePressed(code) {
    const hit = this.pressed.has(code);
    if (hit) this.pressed.delete(code);
    return hit;
  }

  /** The last click, if any, and clears it. */
  takeClick() {
    const click = this.click;
    this.click = null;
    return click;
  }

  clear() {
    this.pressed.clear();
    this.click = null;
  }
}
