import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { screenText } from '@workbench-kit/jdw';

import { ScreenSpecEditor } from './ScreenSpecEditor.js';

describe('ScreenSpecEditor', () => {
  it('renders left pane tabs and Props detail with kind pill', () => {
    const markup = renderToStaticMarkup(
      <ScreenSpecEditor
        value={{
          id: 'demo',
          title: 'Demo',
          description: 'Demo screen',
          frameWidth: 320,
          layout: { maxWidth: 320, maxHeight: 200 },
          root: screenText('Hello'),
        }}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('data-testid="screen-spec-editor"');
    expect(markup).toContain('aria-label="Screen editor panel"');
    expect(markup).toContain('data-testid="screen-spec-rail-outline"');
    expect(markup).toContain('data-testid="screen-spec-rail-screen"');
    expect(markup).not.toContain('data-testid="screen-spec-rail-assets"');
    expect(markup).toContain('data-testid="screen-spec-outline"');
    expect(markup).toContain('data-testid="screen-spec-outline-search"');
    expect(markup).toContain('data-testid="screen-spec-outline-root"');
    expect(markup).toContain('text: Hello');
    expect(markup).toContain('data-testid="screen-spec-inspector"');
    expect(markup).toContain('data-testid="screen-spec-detail-props"');
    expect(markup).toContain('data-testid="screen-spec-detail-assets"');
    expect(markup).toContain('data-testid="screen-spec-kind-pill"');
    expect(markup).toContain('>Text<');
    expect(markup).toContain('data-testid="screen-spec-props"');
    expect(markup).toContain('data-testid="screen-spec-props-search"');
    expect(markup).not.toContain('data-testid="screen-spec-assets"');
  });

  it('renders Assets only on the inspector pane', () => {
    const markup = renderToStaticMarkup(
      <ScreenSpecEditor
        pane="inspector"
        value={{
          id: 'demo',
          title: 'Demo',
          description: 'Demo screen',
          frameWidth: 320,
          layout: { maxWidth: 320, maxHeight: 200 },
          root: screenText('Hello'),
        }}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('data-testid="screen-spec-inspector"');
    expect(markup).toContain('data-testid="screen-spec-detail-assets"');
    expect(markup).not.toContain('aria-label="Screen editor panel"');
  });
});
