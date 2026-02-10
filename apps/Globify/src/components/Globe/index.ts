/**
 * Globe Component Module
 * 
 * Re-exports for the Globe visualization component and related utilities.
 */

// Main component
export { GlobeVisualization } from './GlobeVisualization';
export { default } from './GlobeVisualization';

// Sub-components (for advanced usage/testing)
export { GlobeScene } from './GlobeScene';
export { StarryBackground } from './StarryBackground';
export { Controls } from './Controls';
export { LoadingFallback } from './LoadingFallback';

// Types
export type { GlobeVisualizationProps, DataPoint, GlobeState } from './types';
export type { GlobeSceneProps } from './GlobeScene';
export type { StarryBackgroundProps } from './StarryBackground';

// Constants (for customization)
export * from './constants';

// Textures (for advanced usage)
export { TEXTURE_ASSETS, resolveAssetUri } from './textures';

// Styles (for customization)
export { styles } from './styles';
