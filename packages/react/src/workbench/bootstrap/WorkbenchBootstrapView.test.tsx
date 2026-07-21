/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorkbenchBootstrapView } from './WorkbenchBootstrapView';

describe('WorkbenchBootstrapView', () => {
  it('renders startup tasks and the active step label', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchBootstrapView
        currentTaskId="workspace"
        heading="Preparing workbench"
        status="running"
        tasks={[
          { id: 'extensions', label: 'Loading extensions', status: 'completed' },
          {
            id: 'workspace',
            label: 'Preparing workspace',
            detail: '6 files, 3 folders',
            status: 'running',
          },
        ]}
      />,
    );

    expect(markup).toContain('Preparing workbench');
    expect(markup).toContain('Loading extensions');
    expect(markup).toContain('Preparing workspace…');
    expect(markup).toContain('6 files, 3 folders');
    expect(markup).toContain('role="status"');
  });

  it('renders retry affordance when startup fails', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchBootstrapView
        error="Workspace init failed."
        status="failed"
        tasks={[
          { id: 'extensions', label: 'Loading extensions', status: 'completed' },
          {
            id: 'workspace',
            label: 'Preparing workspace',
            status: 'failed',
            error: 'Workspace init failed.',
          },
        ]}
        onRetry={() => undefined}
      />,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Workspace init failed.');
    expect(markup).toContain('Retry');
  });
});
