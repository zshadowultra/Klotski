# KINEMATIC 2.5D MATERIAL SYSTEM: THE DEFINITIVE ARCHITECTURE

## 1. ARCHITECTURAL MANDATE & PERFORMANCE RISKS
The objective is to implement a premium, tactile physics model (Velocity Deformation, Parallax Shadows, Specular Sheen) without compromising the 60/120fps render target. 

**The Danger:** Animating properties like `box-shadow`, `background-image` (gradients), `width`, `height`, or using CSS `filter` triggers CPU-bound paint and layout recalculations. On mobile devices, this causes catastrophic frame drops and battery drain.
**The Solution:** The entire kinematic system must be isolated to the GPU compositor. We will exclusively animate `transform` (`translate3d`, `scale`) and `opacity` on dedicated, real DOM nodes.

**Implementation Priority:** We will implement this in order of highest perceptual impact to lowest risk: Phase 0 -> Phase 1 (Deformation) -> Phase 2 (Shadows) -> Phase 3 (Sheen).

---

## 2. PHASED IMPLEMENTATION PLAN

### Phase 0: The Blocking Cleanup
**Action:** Remove `.piece.dragging { filter: brightness(1.05); }` from `index.css`.
**Rationale:** CSS `filter` forces a new compositing layer and triggers a GPU texture upload on change. This violates the GPU-only mandate and costs a repaint every time drag state changes.

### Phase 1: Velocity-Based Kinematic Deformation (Squash & Stretch)
**The Goal:** Add organic momentum by microscopically stretching pieces based on their velocity. This provides 80% of the physical feel for 20% of the complexity.
**The Implementation:**
1. **Transform Composition Fix:** Wrap the inner content (`.piece-inner`) in a dedicated `<motion.div className="piece-deformation-wrapper">` to prevent conflicts with the declarative entry animation (`animate={{ scale: 1 }}`).
2. **Velocity Extraction:** Use `useVelocity(xSpring)` and `useVelocity(ySpring)`.
3. **Array-Based Axis Isolation:** You cannot conditionally read motion values in render. Use the array form of `useTransform` to compare velocities and isolate the axis:
   ```ts
   const scaleX = useTransform([xVelocity, yVelocity], ([vx, vy]: number[]) => {
     if (Math.abs(vx) < 150 && Math.abs(vy) < 150) return 1; // Velocity dead-zone
     const maxScale = isMaster ? 1.01 : 1.02; // Mass-specific clamping
     if (Math.abs(vx) >= Math.abs(vy)) return maxScale; // X dominant: stretch
     return isMaster ? 0.99 : 0.98; // Y dominant: squash
   });
   ```
4. **Stagger Gate:** Suppress deformation while the `stagger` prop is true to prevent pieces from squashing/stretching during their initial spring-in animation.

### Phase 2: Parallax Shadow Casting
**The Goal:** Create a realistic depth illusion where shadows cast away from the board's center and elevate when lifted.
**The Implementation:**
1. **Sibling Architecture:** The shadow must be a **sibling** rendered before the piece, receiving the motion values as direct props to avoid 1-frame timing delays caused by `useEffect` ref population.
   ```tsx
   <React.Fragment key={`${resetCount}-${piece.id}`}>
     <PieceShadow xValue={xValue} yValue={yValue} isDragging={isDragging} />
     <PieceComponent zIndex={1} />
   </React.Fragment>
   ```
2. **Static Blur (No Filters):** The shadow element must use a static `box-shadow: 0 8px 20px rgba(0,0,0,0.12)` baked into its CSS. Do **not** use `filter: blur()`, which destroys GPU compositing.
3. **Parallax Offset Math:** 
   `boardCenterX = (BOARD_W * cellSize + (BOARD_W - 1) * GAP + 2 * BOARD_PADDING) / 2`
   `shadowX = useTransform(xValue, x => (x - boardCenterX) * 0.08)`
4. **Elevation Scaling & Cleanup:** When `isDragging` is true, animate the shadow's `scale` down to `0.95` and `opacity` down to `0.4`. **CRITICAL:** Once this is implemented, remove the elevated `box-shadow: 0 32px 64px...` from `.piece.dragging` in CSS to prevent visual conflict.

### Phase 3: High-Performance Dynamic Specular Sheen
**The Goal:** Create a reactive glare that tracks the pointer. This is the highest risk/complexity phase.
**The Implementation:**
1. **DOM Structure:** Inject `<motion.div className="piece-sheen">` as a **direct child** of the outer `.piece` wrapper, but **outside** the `.piece-deformation-wrapper`. The sheen must not squash/stretch with the physical object.
2. **CSS Clipping:** Add `overflow: hidden` to `.piece` in `index.css`.
3. **Sheen Styling:** Use an oversized (200%+) static `radial-gradient` positioned from the top-left.
   * *Light Mode:* Warm/bright sheen.
   * *Dark Mode:* Pure white sheen at a strict `0.06 - 0.08` opacity.
   * *Master Piece:* Cooler `rgba(255,255,255,0.12)` highlight. Ensure sheen renders after the red dot in the DOM so it sits on top.
4. **Coordinate Math:** Use `xSpring.get()` and `ySpring.get()` for accurate sub-pixel rendering positions.
   `localX = pointerClientX - (boardRectRef.current.left + xSpring.get())`
5. **Layout Thrashing Prevention:** Cache `boardRef.current.getBoundingClientRect()` in a `useRef` on listener enable and `window.resize`. Do not call it during `mousemove`.
6. **Translation Cap:** Cap the sheen translation to `cellSize * 0.35` so the gradient edge never becomes visible.
7. **Event-Driven Touch Detection:** Start with the sheen listener disabled. Enable it on the first `mousemove` event. Disable it permanently on the first `touchstart` event. Use ref-based state to prevent React StrictMode double-registration bugs.

---

## 3. STRICT "DO NOT DO" LIST
* **DO NOT** use pseudo-elements (`::before`/`::after`) for motion values.
* **DO NOT** use `filter: blur()` on the shadow or `filter: brightness()` on the piece.
* **DO NOT** place the sheen inside the deformation wrapper.
* **DO NOT** conditionally read `MotionValue`s inside a render function (use array `useTransform`).
* **DO NOT** call `getBoundingClientRect()` inside a RAF or mousemove listener.

---

## 4. ROLLBACK & FAILSAFE STRATEGY
1. **Reactive Kill Switch:** Use a `useEffect` with a `MediaQueryList` event listener for `(prefers-reduced-motion: reduce)`. It must react to mid-session OS-level changes.
2. **Graceful Degradation:** If the kill switch is active, bypass the GPU-intensive sheen, deformation, and parallax layers entirely.
3. **Stress Testing:** Test heavily on Levels 2 and 3 (sparse boards) with CPU 6x throttling to verify the velocity and sheen math at maximum travel distances.
