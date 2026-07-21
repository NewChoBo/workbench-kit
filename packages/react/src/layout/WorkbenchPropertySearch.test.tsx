import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WorkbenchPropertySearch } from './WorkbenchPropertySearch';

describe('WorkbenchPropertySearch', () => {
  it('renders English search chrome with clearable input', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchPropertySearch value="opacity" onValueChange={() => undefined} />,
    );

    expect(markup).toContain('ui-workbench-property-search');
    expect(markup).toContain('data-ui-workbench-property-search="true"');
    expect(markup).toContain('Search properties');
    expect(markup).toContain('opacity');
    expect(markup).toContain('Clear');
  });

  it('allows host-provided placeholder and aria-label', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchPropertySearch
        aria-label="Find inspector fields"
        placeholder="Find fields"
        value=""
        onValueChange={() => undefined}
      />,
    );

    expect(markup).toContain('Find inspector fields');
    expect(markup).toContain('Find fields');
  });
});
