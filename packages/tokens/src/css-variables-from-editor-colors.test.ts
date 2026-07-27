import { describe, expect, it, vi } from 'vitest';

import {
  cssVariablesFromEditorColors,
  EDITOR_COLOR_TO_KIT_TOKEN,
} from './css-variables-from-editor-colors.js';

describe('cssVariablesFromEditorColors', () => {
  it('maps a light editor colors fixture to kit CSS variables', () => {
    const mapped = cssVariablesFromEditorColors({
      'editor.background': '#ffffff',
      'editor.foreground': '#1e1e1e',
      'sideBar.background': '#f3f3f3',
      'button.background': '#0078d4',
      'list.hoverBackground': '#e8e8e8',
    });

    expect(mapped).toEqual({
      '--color-bg': '#ffffff',
      '--color-text': '#1e1e1e',
      '--color-primary-side-bar-bg': '#f3f3f3',
      '--color-accent': '#0078d4',
      '--color-surface-hover': '#e8e8e8',
    });
  });

  it('maps a dark editor colors fixture and skips invalid values', () => {
    const onUnknownKey = vi.fn();
    const mapped = cssVariablesFromEditorColors(
      {
        'editor.background': '#1e1e1e',
        'sideBar.background': '#252526',
        'panel.background': '#181818',
        'button.background': '#0e639c',
        errorForeground: '#f48771',
        'editor.foreground': 'not-a-color',
        'tab.activeBackground': '#333333',
      },
      { onUnknownKey },
    );

    expect(mapped).toEqual({
      '--color-bg': '#1e1e1e',
      '--color-primary-side-bar-bg': '#252526',
      '--color-surface': '#181818',
      '--color-accent': '#0e639c',
      '--color-danger': '#f48771',
    });
    expect(onUnknownKey).toHaveBeenCalledWith('tab.activeBackground');
    expect(EDITOR_COLOR_TO_KIT_TOKEN['editor.background']).toBe('color-bg');
  });

  it('supports a custom prefix without mutating input', () => {
    const colors = { 'editor.background': 'rgb(10, 20, 30)' } as const;
    const mapped = cssVariablesFromEditorColors(colors, { prefix: '--wk-' });

    expect(mapped).toEqual({ '--wk-color-bg': 'rgb(10, 20, 30)' });
    expect(colors).toEqual({ 'editor.background': 'rgb(10, 20, 30)' });
  });
});
