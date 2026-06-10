import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { screenText } from '@workbench-kit/jdw';

import { ScreenSpecEditor } from './ScreenSpecEditor.js';

describe('ScreenSpecEditor', () => {
  it('renders metadata fields and outline', () => {
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
    expect(markup).toContain('data-testid="screen-spec-field-title"');
    expect(markup).toContain('data-testid="screen-spec-outline-root"');
    expect(markup).toContain('text: Hello');
  });
});
