import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { JDW_FIXTURE_COLUMN_TEXT } from './fixtures/jdw-fixtures.js';
import { renderJsonWidget } from './renderJsonWidget.js';

describe('renderJsonWidget', () => {
  it('renders builtin column and text nodes from JDW JSON', () => {
    const markup = renderToStaticMarkup(<>{renderJsonWidget(JDW_FIXTURE_COLUMN_TEXT)}</>);
    expect(markup).toContain('data-widget-type="column"');
    expect(markup).toContain('Hello JDW');
  });

  it('returns null for invalid JSON', () => {
    expect(renderJsonWidget('{ invalid')).toBeNull();
  });
});
