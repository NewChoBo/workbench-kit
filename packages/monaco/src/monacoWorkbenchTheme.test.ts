import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WorkbenchMonaco } from './monaco-loader.js';
import {
  buildDefaultMonacoTokenRules,
  buildMonacoThemeColors,
  buildWorkbenchMonacoThemeInput,
  defineMonacoWorkbenchTheme,
  defineOrUpdateWorkbenchMonacoTheme,
  mergeMonacoTokenRules,
  monacoRulesFromTokenColors,
  setWorkbenchMonacoTokenRules,
  toMonacoTokenColor,
  withAlpha,
  type WorkbenchThemeCssColors,
} from './monacoWorkbenchTheme.js';

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

afterEach(() => {
  setWorkbenchMonacoTokenRules(undefined);
});

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

  it('normalizes token colors for Monaco rules', () => {
    expect(toMonacoTokenColor('#0284c7')).toBe('0284c7');
    expect(toMonacoTokenColor('#0284c759')).toBe('0284c7');
    expect(toMonacoTokenColor('rgb(2, 132, 199)')).toBeUndefined();
    expect(toMonacoTokenColor('')).toBeUndefined();
  });

  it('builds default syntax rules from chrome palette', () => {
    const rules = buildDefaultMonacoTokenRules(sampleColors);
    const byToken = Object.fromEntries(rules.map((rule) => [rule.token, rule]));

    expect(byToken.comment?.foreground).toBe('64748b');
    expect(byToken.comment?.fontStyle).toBe('italic');
    expect(byToken.string?.foreground).toBe('0284c7');
    expect(byToken.keyword?.foreground).toBe('0284c7');
    expect(byToken.number?.foreground).toBe('dc2626');
    expect(byToken.invalid?.foreground).toBe('dc2626');
  });

  it('maps VS Code tokenColors scopes to Monaco rules and skips invalid entries', () => {
    const rules = monacoRulesFromTokenColors([
      { scope: 'comment', settings: { foreground: '#6A9955', fontStyle: 'italic' } },
      {
        scope: ['keyword.control', 'keyword.operator'],
        settings: { foreground: '#C586C0' },
      },
      { scope: 'string', settings: { foreground: 'not-a-color' } },
      { settings: { foreground: '#ffffff' } },
    ]);

    expect(rules).toEqual([
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword.flow', foreground: 'C586C0' },
      { token: 'keyword', foreground: 'C586C0' },
    ]);
  });

  it('merges token rules with later lists winning', () => {
    expect(
      mergeMonacoTokenRules(
        [{ token: 'comment', foreground: '111111' }],
        [
          { token: 'comment', foreground: '222222' },
          { token: 'string', foreground: '333333' },
        ],
      ),
    ).toEqual([
      { token: 'comment', foreground: '222222' },
      { token: 'string', foreground: '333333' },
    ]);
  });

  it('defineOrUpdateWorkbenchMonacoTheme forwards base, colors, and rules to defineTheme', () => {
    const defineTheme = vi.fn();
    const monacoInstance = { editor: { defineTheme } } as unknown as WorkbenchMonaco;

    defineOrUpdateWorkbenchMonacoTheme(monacoInstance, 'workbench-kit-dark', {
      base: 'vs-dark',
      colors: { 'editor.background': '#0d1117' },
      rules: [{ token: 'comment', foreground: '8b949e' }],
    });

    expect(defineTheme).toHaveBeenCalledWith('workbench-kit-dark', {
      base: 'vs-dark',
      inherit: true,
      colors: { 'editor.background': '#0d1117' },
      rules: [{ token: 'comment', foreground: '8b949e' }],
    });
  });

  it('buildWorkbenchMonacoThemeInput merges default + host + option rules for defineTheme', () => {
    setWorkbenchMonacoTokenRules([{ token: 'comment', foreground: 'ff00ff' }]);

    const input = buildWorkbenchMonacoThemeInput('light', sampleColors, {
      rules: [{ token: 'string', foreground: '00ff00' }],
    });

    expect(input.base).toBe('vs');
    expect(input.colors?.['editor.background']).toBe('#f4f9fc');
    expect(input.rules?.find((rule) => rule.token === 'comment')?.foreground).toBe('ff00ff');
    expect(input.rules?.find((rule) => rule.token === 'string')?.foreground).toBe('00ff00');
    expect(input.rules?.find((rule) => rule.token === 'keyword')?.foreground).toBe('0284c7');

    const defineTheme = vi.fn();
    const monacoInstance = { editor: { defineTheme } } as unknown as WorkbenchMonaco;
    defineOrUpdateWorkbenchMonacoTheme(monacoInstance, 'workbench-kit-light', input);
    // No DOM → defineMonacoWorkbenchTheme is a safe no-op in node tests.
    defineMonacoWorkbenchTheme(monacoInstance, 'light');
    expect(defineTheme).toHaveBeenCalledTimes(1);
  });
});
