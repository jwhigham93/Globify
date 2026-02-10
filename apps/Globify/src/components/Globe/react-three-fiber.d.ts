/**
 * Type declarations for @react-three/fiber JSX elements
 */
import { Object3D } from 'three';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      primitive: { object: Object3D; [key: string]: any };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ambientLight: { intensity?: number; color?: string | number; [key: string]: any };
      directionalLight: { 
        intensity?: number; 
        color?: string | number; 
        position?: [number, number, number];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any 
      };
    }
  }
}

export {};
