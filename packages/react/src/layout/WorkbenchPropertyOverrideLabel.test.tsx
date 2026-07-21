/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { WorkbenchPropertyOverrideLabel } from './WorkbenchPropertyOverrideLabel';

describe('WorkbenchPropertyOverrideLabel', () => {
  it('shows Custom badge when overridden', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchPropertyOverrideLabel label="Timezone" overridden />,
    );

    expect(markup).toContain('ui-workbench-property-override-label');
    expect(markup).toContain('Timezone');
    expect(markup).toContain('Custom');
    expect(markup).toContain('data-ui-workbench-property-override-badge="custom"');
    expect(markup).not.toContain('Default');
    expect(markup).not.toContain('Reset');
  });

  it('shows muted Default badge when not overridden', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchPropertyOverrideLabel label="Locale" overridden={false} />,
    );

    expect(markup).toContain('Locale');
    expect(markup).toContain('Default');
    expect(markup).toContain('data-ui-workbench-property-override-badge="default"');
    expect(markup).toContain('data-variant="muted"');
    expect(markup).not.toContain('Custom');
    expect(markup).not.toContain('Reset');
  });

  it('hides Reset when overridden but onReset is omitted', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchPropertyOverrideLabel label="Theme" overridden />,
    );

    expect(markup).toContain('Custom');
    expect(markup).not.toContain('Reset');
    expect(markup).not.toContain('data-ui-workbench-property-override-reset');
  });

  it('hides Reset when onReset is provided but not overridden', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchPropertyOverrideLabel label="Theme" overridden={false} onReset={() => undefined} />,
    );

    expect(markup).toContain('Default');
    expect(markup).not.toContain('Reset');
  });

  it('renders Reset and calls onReset once per click when overridden', async () => {
    const onReset = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<WorkbenchPropertyOverrideLabel label="Opacity" overridden onReset={onReset} />);
    });

    const resetButton = container.querySelector(
      '[data-ui-workbench-property-override-reset="true"]',
    );
    expect(resetButton).not.toBeNull();
    expect(resetButton?.textContent).toBe('Reset');

    await act(async () => {
      resetButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onReset).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('accepts host-provided badge and reset labels', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchPropertyOverrideLabel
        customBadgeLabel="Override"
        defaultBadgeLabel="Baseline"
        label="Scale"
        overridden
        resetLabel="Clear"
        onReset={() => undefined}
      />,
    );

    expect(markup).toContain('Override');
    expect(markup).toContain('Clear');
    expect(markup).not.toContain('Custom');
    expect(markup).not.toContain('Reset');
  });
});
