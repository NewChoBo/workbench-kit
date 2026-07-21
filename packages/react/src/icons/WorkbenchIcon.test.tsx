import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WorkbenchIcon, WorkbenchIconProvider } from './index';

describe('WorkbenchIcon', () => {
  it('renders codicon for string ids by default', () => {
    const markup = renderToStaticMarkup(<WorkbenchIcon icon="search" />);
    expect(markup).toContain('codicon-search');
  });

  it('renders explicit codicon descriptors', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchIcon icon={{ kind: 'codicon', name: 'files' }} />,
    );
    expect(markup).toContain('codicon-files');
  });

  it('renders custom nodes from descriptors', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchIcon icon={{ kind: 'node', node: <svg data-testid="custom" /> }} />,
    );
    expect(markup).toContain('data-testid="custom"');
  });

  it('uses host resolver for string ids when provided', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchIconProvider
        resolveStringIcon={(icon) => <span data-icon-set="custom">{icon}</span>}
      >
        <WorkbenchIcon icon="search" />
      </WorkbenchIconProvider>,
    );
    expect(markup).toContain('data-icon-set="custom"');
    expect(markup).toContain('search');
    expect(markup).not.toContain('codicon-search');
  });
});
