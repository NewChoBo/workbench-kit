import { describe, expect, it } from 'vitest';
import {
  buildMonacoThemeColors,
  withAlpha,
  type WorkbenchThemeCssColors,
} from './monacoWorkbenchTheme';

const sampleColors: WorkbenchThemeCssColors = {
  accent: '#0284c7',
  bg: '#f4f9fc',
  border: '#c5dff0',
  danger: '#dc2626',
  focusBorder: '#0284c7',
  scrollbarThumb: '#b8d4e866',
  scrollbarThumbActive: '#5a93b4aa',
  scrollbarThumbHover: '#7eb3d488',
  surface: '#eef6fb',
  surfaceElevated: '#ffffff',
  surfaceHover: '#ddeef8',
  text: '#0f172a',
  textMuted: '#475569',
  textSubtle: '#64748b',
};

describe('monacoWorkbenchTheme', () => {
  it('maps workbench CSS colors to Monaco editor surfaces', () => {
    const monacoColors = buildMonacoThemeColors(sampleColors);

    expect(monacoColors['editor.background']).toBe('#f4f9fc');
    expect(monacoColors['editor.foreground']).toBe('#0f172a');
    expect(monacoColors['editor.selectionBackground']).toBe('#0284c759');
    expect(monacoColors.focusBorder).toBe('#0284c7');
  });

  it('adds alpha to hex and rgb colors', () => {
    expect(withAlpha('#0284c7', 0.35)).toBe('#0284c759');
    expect(withAlpha('rgb(2, 132, 199)', 0.35)).toBe('#0284c759');
  });
});
