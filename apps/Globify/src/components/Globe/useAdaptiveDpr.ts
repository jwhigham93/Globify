/**
 * Adaptive resolution.
 *
 * The static `dpr` cap keeps a phone from starting out at 4x the fragment cost,
 * but it can't react to thermal throttling — which is the failure users
 * actually described: fine for a minute, then permanently slow. This watches a
 * rolling mean of frame times and steps the pixel ratio down when frames run
 * long, back up when they recover.
 *
 * Hysteresis (a longer confirmation window on the way up than down) and a
 * per-step cap keep it from oscillating between two resolutions.
 */
import { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import {
  DPR_MIN,
  DPR_SAMPLE_FRAMES,
  DPR_DOWNSCALE_MS,
  DPR_UPSCALE_MS,
} from './constants';

const DOWNSCALE_STEP = 0.8;
const UPSCALE_STEP = 1.15;
/** Consecutive slow windows before stepping down. */
const SLOW_WINDOWS_TO_DROP = 2;
/** Consecutive fast windows before stepping up — deliberately slower to react. */
const FAST_WINDOWS_TO_RAISE = 4;

export function useAdaptiveDpr(maxDpr: number): void {
  const gl = useThree((state) => state.gl);

  const frames = useRef(0);
  const elapsedMs = useRef(0);
  const slowWindows = useRef(0);
  const fastWindows = useRef(0);
  const current = useRef(maxDpr);

  useFrame((_state, delta) => {
    frames.current += 1;
    elapsedMs.current += delta * 1000;
    if (frames.current < DPR_SAMPLE_FRAMES) return;

    const meanMs = elapsedMs.current / frames.current;
    frames.current = 0;
    elapsedMs.current = 0;

    if (meanMs > DPR_DOWNSCALE_MS) {
      fastWindows.current = 0;
      slowWindows.current += 1;
      if (slowWindows.current >= SLOW_WINDOWS_TO_DROP && current.current > DPR_MIN) {
        slowWindows.current = 0;
        current.current = Math.max(DPR_MIN, current.current * DOWNSCALE_STEP);
        gl.setPixelRatio(current.current);
      }
      return;
    }

    if (meanMs < DPR_UPSCALE_MS) {
      slowWindows.current = 0;
      fastWindows.current += 1;
      if (fastWindows.current >= FAST_WINDOWS_TO_RAISE && current.current < maxDpr) {
        fastWindows.current = 0;
        current.current = Math.min(maxDpr, current.current * UPSCALE_STEP);
        gl.setPixelRatio(current.current);
      }
      return;
    }

    // In the comfortable band — reset both counters so a mixed run of slow and
    // fast windows doesn't accumulate into a spurious step.
    slowWindows.current = 0;
    fastWindows.current = 0;
  });
}
