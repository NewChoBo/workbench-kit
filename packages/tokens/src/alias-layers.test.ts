import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

function readCss(relativePath: string): string {
  return readFileSync(join(here, relativePath), 'utf8').replace(/\r\n/g, '\n');
}

describe('token alias layers', () => {
  it('documents primitive → semantic → flat → shell ownership in alias-layers.css', () => {
    const aliasCss = readCss('./alias-layers.css');

    expect(aliasCss).toContain('--primitive-neutral-950');
    expect(aliasCss).toContain('--color-bg-canvas: var(--primitive-neutral-950)');
    expect(aliasCss).toContain('--color-bg: var(--color-bg-canvas)');
    expect(aliasCss).toContain('--shell-activity-bg: var(--color-bg-sidebar)');
    expect(aliasCss).toContain('--shell-editor-bg: var(--color-bg-canvas)');
  });

  it('loads alias layers from styles.css before theme presets', () => {
    const stylesCss = readCss('./styles.css');

    expect(stylesCss).toContain("@import './alias-layers.css'");
    expect(stylesCss.indexOf("@import './alias-layers.css'")).toBeLessThan(
      stylesCss.indexOf("@import './theme-presets.css'"),
    );
    expect(stylesCss).not.toMatch(/--color-bg:\s*#0d1117/);
  });

  it('ships a brand pack that overrides primitives only', () => {
    const slateCss = readCss('./themes/dark/slate.css');
    const themePresetsCss = readCss('./theme-presets.css');

    expect(themePresetsCss).toContain("@import './themes/dark/slate.css'");
    expect(slateCss).toContain("[data-theme='dark'][data-theme-preset='slate']");
    expect(slateCss).toContain('--primitive-neutral-950');
    expect(slateCss).toContain('--primitive-accent-500');
    expect(slateCss).not.toContain('--color-bg:');
    expect(slateCss).not.toContain('--shell-editor-bg:');
  });
});
