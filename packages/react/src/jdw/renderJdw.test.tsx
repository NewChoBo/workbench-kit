import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { JDW_FIXTURE_COLUMN_TEXT } from './fixtures/jdw-fixtures.js';
import { renderJdw } from './renderJdw.js';

describe('renderJdw', () => {
  it('renders builtin column and text nodes from JDW JSON', () => {
    const markup = renderToStaticMarkup(<>{renderJdw(JDW_FIXTURE_COLUMN_TEXT)}</>);
    expect(markup).toContain('data-css-render-root="true"');
    expect(markup).toContain('Hello JDW');
  });

  it('returns null for invalid JSON', () => {
    expect(renderJdw('{ invalid')).toBeNull();
  });
});
