import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Chip } from './Chip';

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
});
