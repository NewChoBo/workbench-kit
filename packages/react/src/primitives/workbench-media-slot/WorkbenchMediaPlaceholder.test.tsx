import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WorkbenchMediaPlaceholder } from './WorkbenchMediaPlaceholder';

describe('WorkbenchMediaPlaceholder', () => {
  it('renders a fill placeholder frame with a codicon', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchMediaPlaceholder icon="library" iconClassName="ui-workbench-thumbnail__icon" />,
    );

    expect(markup).toContain('ui-workbench-media-slot__placeholder');
    expect(markup).toContain('ui-workbench-media-slot__icon');
    expect(markup).toContain('ui-workbench-thumbnail__icon');
    expect(markup).toContain('codicon-library');
  });
});
