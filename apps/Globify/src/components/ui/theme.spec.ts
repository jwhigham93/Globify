/**
 * Guards for the brutalist token set.
 *
 * The radius assertions are the point: the whole HUD was rounded before, and
 * a single reintroduced `borderRadius` in a shared surface would quietly undo
 * the restyle across every panel that composes it.
 */
import { StyleSheet } from 'react-native';
import { RADIUS, surface, type, color, border, font } from './theme';

describe('theme', () => {
  it('has zero corner radius', () => {
    expect(RADIUS).toBe(0);
  });

  it('never rounds a shared surface', () => {
    for (const [name, style] of Object.entries(surface)) {
      const flat = StyleSheet.flatten(style) as { borderRadius?: number };
      // Either unset (inherits 0) or explicitly 0 — never a positive radius.
      expect([undefined, 0]).toContain(flat.borderRadius);
      expect(name).toBeTruthy();
    }
  });

  it('lets the scene show through panel fills', () => {
    // Opaque fills made every panel read as a black slab pasted over the globe.
    // Brutalism here is carried by the square corners and hard borders instead.
    const panel = StyleSheet.flatten(surface.panel) as { backgroundColor?: string };
    expect(panel.backgroundColor).toBe(color.surface);

    const alpha = /rgba\([^)]*,\s*([\d.]+)\)/.exec(color.surface)?.[1];
    expect(alpha).toBeDefined();
    expect(Number(alpha)).toBeGreaterThan(0.5);
    expect(Number(alpha)).toBeLessThan(1);
  });

  it('draws panel borders at full contrast', () => {
    const panel = StyleSheet.flatten(surface.panel) as {
      borderWidth?: number;
      borderColor?: string;
    };
    expect(panel.borderWidth).toBe(border.thick);
    expect(panel.borderColor).toBe(color.line);
  });

  it('inverts the active button rather than tinting it', () => {
    const active = StyleSheet.flatten(surface.buttonActive) as {
      backgroundColor?: string;
    };
    expect(active.backgroundColor).toBe(color.accent);
    expect(
      (StyleSheet.flatten(type.buttonActiveLabel) as { color?: string }).color,
    ).toBe(color.inverse);
  });

  it('uppercases via textTransform, not by rewriting strings', () => {
    for (const name of ['label', 'title', 'button'] as const) {
      const flat = StyleSheet.flatten(type[name]) as {
        textTransform?: string;
        fontFamily?: string;
      };
      expect(flat.textTransform).toBe('uppercase');
      expect(flat.fontFamily).toBe(font.mono);
    }
  });
});
