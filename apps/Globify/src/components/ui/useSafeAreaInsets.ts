/**
 * Safe-area insets for the web build.
 *
 * On iOS Safari/Chrome the browser toolbars and the notch overlap a page laid
 * out at `100vh`. `public/index.html` declares `viewport-fit=cover` and mirrors
 * `env(safe-area-inset-*)` into CSS custom properties; this hook reads those
 * back so React Native styles can offset overlays by them.
 *
 * Native returns zeroes: `App.tsx` already wraps native in RN's `SafeAreaView`,
 * and adding insets on top of that would double-pad.
 */
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const ZERO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

const CSS_VARS: Record<keyof Insets, string> = {
  top: '--safe-top',
  right: '--safe-right',
  bottom: '--safe-bottom',
  left: '--safe-left',
};

const isWeb = Platform.OS === 'web';

/** Read the four CSS custom properties off the document element. */
function readInsets(): Insets {
  if (!isWeb || typeof document === 'undefined' || !document.documentElement) {
    return ZERO_INSETS;
  }
  const computed = getComputedStyle(document.documentElement);
  const next = { ...ZERO_INSETS };
  for (const edge of Object.keys(CSS_VARS) as (keyof Insets)[]) {
    const parsed = parseFloat(computed.getPropertyValue(CSS_VARS[edge]));
    next[edge] = Number.isFinite(parsed) ? parsed : 0;
  }
  return next;
}

function sameInsets(a: Insets, b: Insets): boolean {
  return a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;
}

// Module-level cache so every subscriber shares one set of listeners and
// useSyncExternalStore sees a stable snapshot identity between changes.
let cached: Insets = ZERO_INSETS;
let initialized = false;
const subscribers = new Set<() => void>();

function refresh(): void {
  const next = readInsets();
  if (sameInsets(cached, next)) return;
  cached = next;
  subscribers.forEach((fn) => fn());
}

function subscribe(onChange: () => void): () => void {
  if (!isWeb || typeof window === 'undefined') return () => undefined;

  if (!initialized) {
    initialized = true;
    cached = readInsets();
    window.addEventListener('resize', refresh);
    window.addEventListener('orientationchange', refresh);
    // Fires when the iOS toolbar collapses/expands, which `resize` can miss.
    window.visualViewport?.addEventListener('resize', refresh);
  }

  subscribers.add(onChange);
  // A late subscriber may have missed a change while nobody was listening.
  refresh();
  return () => {
    subscribers.delete(onChange);
  };
}

function getSnapshot(): Insets {
  return cached;
}

/** Current safe-area insets in px. Always zero on native. */
export function useSafeAreaInsets(): Insets {
  return useSyncExternalStore(subscribe, getSnapshot, () => ZERO_INSETS);
}
