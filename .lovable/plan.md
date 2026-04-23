**Role:** Senior Full-stack Engineer & UX Specialist.  
**Goal:** Refactor the current home screen into a rock-solid, non-scrolling 100dvh "Native-feel" shell that behaves like a high-end iOS app.

#### 1. Global Viewport & PWA Lock (Root Level)

- **index.html:** Update meta viewport to: width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover.
- Add PWA meta tags: apple-mobile-web-app-capable="yes", apple-mobile-web-app-status-bar-style="black-translucent".
- **Global CSS (styles.css):**
  - Set html, body, #root to height: 100dvh; width: 100vw; overflow: hidden; overscroll-behavior: none;.
  - Apply touch-action: manipulation to kill double-tap zoom.
  - Set -webkit-tap-highlight-color: transparentand -webkit-text-size-adjust: 100%.
  - Implement a global safe-area utility using env(safe-area-inset-...).

#### 2. Layout Architecture (CSS Grid Shell)

Rebuild src/routes/index.tsx using a fixed CSS Grid that occupies exactly 100dvh without overflow:

- **Grid Template Rows:**
  - auto (TopBar - 56px)
  - auto (Mode Tabs - 44px)
  - auto (Hero Greeting)
  - auto (Composer Area)
  - auto (Suggestions - 36px)
  - minmax(0, 1fr) (KPI 2x2 Grid - must be flexible but non-overflowing)
  - minmax(0, 1.2fr) (Agents List - **THE ONLY SCROLLABLE ZONE**)
  - auto (Bottom Nav - 64px + safe-area-bottom)

**Constraints:**

- Use min-h-0 on all flex/grid children to prevent content-driven expansion.
- The **Agents List** must use -webkit-overflow-scrolling: touch with a hidden scrollbar and a top/bottom fade mask.
- Use clamp() for all typography and spacing to ensure perfect fit on displays from 360px to 430px (e.g., Hero: clamp(28px, 8vw, 40px)).

#### 3. Interaction Guards (JS Level)

In __root.tsx or a dedicated hook, implement strict event prevention:

- Prevent pinch-to-zoom: Intercept gesturestart, gesturechange, gestureend and preventDefault.
- Prevent Ctrl/Cmd + (+/-/0) and Ctrl + MouseWheel zoom.
- Ensure all listeners use { passive: false }where necessary to allow preventDefault.

#### 4. Design Polish & "Native" Feel

- **Paddings:** Use fluid clamp() instead of fixed px-6.
- **Bottom Nav:** Position as sticky or part of the grid bottom row. Do NOT use fixed to avoid iOS keyboard/URL bar bugs.
- **Visuals:** Ensure the "hairline" borders and "full-bleed" background under the status bar.
- **Micro-interactions:** Ensure zero "white flashes" on tap and immediate active states.

#### 5. Execution Plan

1. Update index.html and styles.css for the foundation.
2. Inject the JS Guard in the root layout.
3. Refactor the Home route layout into the specified CSS Grid.
4. Clean up any legacy margins/paddings that cause overflow.

**Do not add new dependencies. Focus on CSS-native solutions and pure React/TS logic**