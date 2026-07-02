import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PanelLoading } from './PanelLoading';

describe('PanelLoading', () => {
  it('renders a centered panel loading state with spinner', () => {
    const markup = renderToStaticMarkup(<PanelLoading label="Loading messages" />);

    expect(markup).toContain('ui-panel-loading');
    expect(markup).toContain('ui-panel-centered-state');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('codicon-loading');
    expect(markup).toContain('Loading messages');
  });

  it('can hide the spinner', () => {
    const markup = renderToStaticMarkup(<PanelLoading label="Loading" showSpinner={false} />);

    expect(markup).not.toContain('codicon-loading');
    expect(markup).toContain('Loading');
  });
});
