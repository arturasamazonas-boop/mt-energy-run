// Keyboard, touch and mouse input for the runner.
// Touch: right side = jump (hold for higher), left side = slide (hold).

const MIN_JUMP_GAP_MS = 150;
const TOUCH_MOUSE_GUARD_MS = 1000;

export class Input {
  constructor(target) {
    this.target = target;
    this.enabled = false;
    this.jumpQueued = false;
    this.abilityQueued = { shield: false, slow: false };
    this.hitTest = null; // (clientX, clientY) -> 'shield' | 'slow' | null (ability buttons)
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
    const { shield, slow } = this.abilityQueued;
    this.abilityQueued = { shield: false, slow: false };
    return { jump, jumpHeld: this.jumpHeld || jump, slide: this.slideHeld, shield, slow };
  }

  reset() {
    this.jumpQueued = false;
    this.abilityQueued = { shield: false, slow: false };
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
    if (kind === 'shield' || kind === 'slow') {
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
    const ABILITY = { KeyQ: 'shield', KeyE: 'slow' };
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
      } else if (ABILITY[e.code]) {
        e.preventDefault();
        if (!e.repeat) this.press(ABILITY[e.code]);
      } else if (SLIDE.has(e.code)) {
        e.preventDefault();
        if (!this.slideKeys.has(e.code)) this.press('slide');
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
          const z = this.zoneFor(touch.clientX);
          this.touches.set(touch.identifier, z);
          this.press(z);
        }
      },
      { passive: false },
    );
    const end = (e) => {
      for (const touch of e.changedTouches) this.touches.delete(touch.identifier);
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
