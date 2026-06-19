import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ExplorerActionBar } from './ExplorerActionBar';

describe('ExplorerActionBar', () => {
  it('renders explorer action buttons', () => {
    const markup = renderToStaticMarkup(
      <ExplorerActionBar
        onNewFile={() => undefined}
        onNewFolder={() => undefined}
        onRefresh={() => undefined}
      />,
    );

    expect(markup).toContain('ui-explorer-action-bar');
    expect(markup).toContain('aria-label="New file"');
    expect(markup).toContain('aria-label="New folder"');
    expect(markup).toContain('aria-label="Refresh Explorer"');
  });
});
