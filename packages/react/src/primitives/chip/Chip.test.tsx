import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Chip, FilterChip } from './Chip';

describe('Chip', () => {
  it('renders label, optional count, and dismiss affordance', () => {
    const markup = renderToStaticMarkup(
      <Chip aria-label="Remove Action" count={3} label="Action" onDismiss={() => undefined} />,
    );

    expect(markup).toContain('ui-chip');
    expect(markup).toContain('ui-filter-chip');
    expect(markup).toContain('Action');
    expect(markup).toContain('3');
    expect(markup).toContain('codicon-close');
    expect(markup).toContain('aria-label="Remove Action"');
  });

  it('keeps FilterChip as a deprecated alias of Chip', () => {
    expect(FilterChip).toBe(Chip);
  });

  it('re-exports from primitives entry without import cycle', async () => {
    const entry = await import('..');
    const module = await import('./index');

    expect(entry.Chip).toBe(module.Chip);
    expect(entry.FilterChip).toBe(module.FilterChip);
  });
});
