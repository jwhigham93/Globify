import { useEffect } from 'react';
import type { RefObject } from 'react';
import { useThree } from '@react-three/fiber';
import type { GlobeControls as GlobeControlsImpl } from '3d-tiles-renderer/three';

/**
 * Reproduces a workaround documented directly in the three.js
 * webgl_loader_3dtiles reference example's own source comment:
 * "Workaround: adjustHeight causes camera drift as tiles load. Disable
 * until first user interaction." GlobeControls' `adjustHeight` snaps the
 * camera's height to the actual tile surface as tiles resolve; enabling it
 * before any tiles have loaded makes the camera drift unpredictably during
 * zoom/pan — reported live as a "microscope"-style zoom glitch (task 9
 * bug-fix). The reference keeps it off until the first pointerdown/wheel,
 * then leaves it on permanently. Reproduced verbatim rather than
 * reinvented, since the reference's own comment already explains why.
 *
 * Must be a descendant of <Canvas> (needs useThree for the DOM element)
 * and given a ref to the same <GlobeControls> instance that was mounted
 * with `adjustHeight={false}`.
 */
export function AdjustHeightOnInteraction({
  controlsRef,
}: {
  controlsRef: RefObject<GlobeControlsImpl | null>;
}) {
  const domElement = useThree((state) => state.gl.domElement);

  useEffect(() => {
    function enableAdjustHeight() {
      if (controlsRef.current) controlsRef.current.adjustHeight = true;
      domElement.removeEventListener('pointerdown', enableAdjustHeight);
      domElement.removeEventListener('wheel', enableAdjustHeight);
    }

    domElement.addEventListener('pointerdown', enableAdjustHeight);
    domElement.addEventListener('wheel', enableAdjustHeight);
    return () => {
      domElement.removeEventListener('pointerdown', enableAdjustHeight);
      domElement.removeEventListener('wheel', enableAdjustHeight);
    };
  }, [domElement, controlsRef]);

  return null;
}
