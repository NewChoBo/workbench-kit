import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ViewEmptyState } from './ViewEmptyState';

describe('ViewEmptyState', () => {
  it('renders muted placeholder copy for view hosts', () => {
    const markup = renderToStaticMarkup(
      <ViewEmptyState>No virtual workspace is registered.</ViewEmptyState>,
    );

    expect(markup).toContain('ui-view-empty-state');
    expect(markup).toContain('No virtual workspace is registered.');
  });
});
