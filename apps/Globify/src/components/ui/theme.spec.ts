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

  it('uses opaque panel fills rather than translucency', () => {
    const panel = StyleSheet.flatten(surface.panel) as {
      backgroundColor?: string;
    };
    expect(panel.backgroundColor).toBe(color.surface);
    expect(panel.backgroundColor).not.toMatch(/rgba/);
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
