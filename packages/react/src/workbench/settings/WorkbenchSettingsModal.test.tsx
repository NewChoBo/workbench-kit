import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WorkbenchSettingsModal } from './WorkbenchSettingsModal';

describe('WorkbenchSettingsModal', () => {
  it('renders settings as a movable maximizable modal window', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchSettingsModal
        categories={[
          {
            content: <p>Appearance controls</p>,
            id: 'appearance',
            label: 'Appearance',
          },
        ]}
        title="Settings"
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('data-draggable="true"');
    expect(markup).toContain('aria-label="Maximize modal"');
    expect(markup).toContain('Appearance controls');
  });
});
