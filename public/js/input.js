// Keyboard, touch and mouse input for the runner.
// Touch: right side = jump (hold for higher), left side = slide (hold).
// In the cable tunnel (swipeMode): swipe ← → to change lane / turn, ↑ jump, ↓ slide; taps still work.

const MIN_JUMP_GAP_MS = 150;
const TOUCH_MOUSE_GUARD_MS = 1000;
const SWIPE_PX = 24;

export class Input {
  constructor(target) {
    this.target = target;
    this.enabled = false;
    this.jumpQueued = false;
    this.abilityQueued = { shield: false, jet: false };
    this.moveQueued = { left: 0, right: 0, slideTap: false };
    this.swipeMode = false;
    this.swipes = new Map(); // touch id -> { x, y, done }
    this.hitTest = null; // (clientX, clientY) -> 'shield' | 'jet' | null (ability buttons)
    this.jumpKeys = new Set();
    this.slideKeys = new Set();
    this.touches = new Map(); // id -> 'jump' | 'slide'
    this.mouse = null;
    this.onPause = null;
    this.onAnyAction = null;
    this.lastKind = 'keys';
    this.lastTouch = -Infinity;
    this.lastJump = -Infinity;
    this.bind();
  }

  get jumpHeld() {
    if (this.jumpKeys.size) return true;
    if (this.mouse === 'jump') return true;
    for (const v of this.touches.values()) if (v === 'jump') return true;
    return false;
  }

  get slideHeld() {
    if (this.slideKeys.size) return true;
    if (this.mouse === 'slide') return true;
    for (const v of this.touches.values()) if (v === 'slide') return true;
    return false;
  }

  /** Called once per simulation step. */
  consume() {
    const jump = this.jumpQueued;
    this.jumpQueued = false;
    const { shield, jet } = this.abilityQueued;
    this.abilityQueued = { shield: false, jet: false };
    // quick double presses (two lanes) are spread over consecutive steps
    const q = this.moveQueued;
    const left = q.left > 0;
    const right = q.right > 0;
    const slideTap = q.slideTap;
    if (left) q.left--;
    if (right) q.right--;
    q.slideTap = false;
    return { jump, jumpHeld: this.jumpHeld || jump, slide: this.slideHeld, shield, jet, left, right, slideTap };
  }

  reset() {
    this.jumpQueued = false;
    this.abilityQueued = { shield: false, jet: false };
    this.moveQueued = { left: 0, right: 0, slideTap: false };
    this.swipes.clear();
    this.jumpKeys.clear();
    this.slideKeys.clear();
    this.touches.clear();
    this.mouse = null;
  }

  zoneFor(clientX) {
    // jump is the more frequent action, so it gets the larger share of the screen
    const r = this.target.getBoundingClientRect();
    return clientX - r.left < r.width * 0.35 ? 'slide' : 'jump';
  }

  press(kind) {
    if (!this.enabled) return;
    if (kind === 'left' || kind === 'right' || kind === 'slideTap') {
      if (kind === 'slideTap') this.moveQueued.slideTap = true;
      else this.moveQueued[kind] = Math.min(2, this.moveQueued[kind] + 1);
      this.onAnyAction?.(kind);
      return;
    }
    if (kind === 'shield' || kind === 'jet') {
      this.abilityQueued[kind] = true;
      this.onAnyAction?.(kind);
      return;
    }
    if (kind === 'jump') {
      // two jump presses this close together are one tap reported twice, not a
      // double jump (a deliberate second tap comes much later in the air)
      const now = performance.now();
      if (now - this.lastJump < MIN_JUMP_GAP_MS) return;
      this.lastJump = now;
      this.jumpQueued = true;
    }
    this.onAnyAction?.(kind);
  }

  bind() {
    const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']);
    const SLIDE = new Set(['ArrowDown', 'KeyS']);
    const ABILITY = { KeyQ: 'shield', KeyE: 'jet' };
    const LANE = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    window.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.enabled) {
          this.onPause?.();
          e.preventDefault();
        }
        return;
      }
      if (!this.enabled) return;
      this.lastKind = 'keys';
      if (JUMP.has(e.code)) {
        e.preventDefault();
        if (!e.repeat) {
          this.jumpKeys.add(e.code);
          this.press('jump');
        }
      } else if (LANE[e.code]) {
        e.preventDefault();
        if (!e.repeat) this.press(LANE[e.code]);
      } else if (ABILITY[e.code]) {
        e.preventDefault();
        if (!e.repeat) this.press(ABILITY[e.code]);
      } else if (SLIDE.has(e.code)) {
        e.preventDefault();
        if (!this.slideKeys.has(e.code)) {
          this.press('slide');
          this.moveQueued.slideTap = true; // a quick tap still slides in the tunnel
        }
        this.slideKeys.add(e.code);
      }
    });
    window.addEventListener('keyup', (e) => {
      this.jumpKeys.delete(e.code);
      this.slideKeys.delete(e.code);
    });
    window.addEventListener('blur', () => this.reset());

    const t = this.target;
    t.addEventListener(
      'touchstart',
      (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        this.lastKind = 'touch';
        this.lastTouch = performance.now();
        for (const touch of e.changedTouches) {
          const ability = this.hitTest?.(touch.clientX, touch.clientY);
          if (ability) {
            this.press(ability);
            continue;
          }
          if (this.swipeMode) {
            // decided on move (swipe) or release (tap)
            this.swipes.set(touch.identifier, { x: touch.clientX, y: touch.clientY, done: false });
            continue;
          }
          const z = this.zoneFor(touch.clientX);
          this.touches.set(touch.identifier, z);
          this.press(z);
        }
      },
      { passive: false },
    );
    t.addEventListener(
      'touchmove',
      (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        for (const touch of e.changedTouches) {
          const sw = this.swipes.get(touch.identifier);
          if (!sw || sw.done) continue;
          const dx = touch.clientX - sw.x;
          const dy = touch.clientY - sw.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) continue;
          sw.done = true;
          if (Math.abs(dx) > Math.abs(dy)) this.press(dx < 0 ? 'left' : 'right');
          else this.press(dy < 0 ? 'jump' : 'slideTap');
        }
      },
      { passive: false },
    );
    const end = (e) => {
      for (const touch of e.changedTouches) {
        this.touches.delete(touch.identifier);
        const sw = this.swipes.get(touch.identifier);
        this.swipes.delete(touch.identifier);
        // a tap without a swipe: right side jumps, left side slides
        if (sw && !sw.done && this.enabled) this.press(this.zoneFor(sw.x) === 'jump' ? 'jump' : 'slideTap');
      }
    };
    t.addEventListener('touchend', end);
    t.addEventListener('touchcancel', end);

    t.addEventListener('mousedown', (e) => {
      if (!this.enabled || e.button !== 0) return;
      // some phones still send a "mouse" click after a tap: it is the same tap
      if (performance.now() - this.lastTouch < TOUCH_MOUSE_GUARD_MS) return;
      this.lastKind = 'mouse';
      const ability = this.hitTest?.(e.clientX, e.clientY);
      if (ability) {
        this.press(ability);
        return;
      }
      this.mouse = this.zoneFor(e.clientX);
      this.press(this.mouse);
    });
    window.addEventListener('mouseup', () => {
      this.mouse = null;
    });
    t.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}

export function isTouchDevice() {
  return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
}
