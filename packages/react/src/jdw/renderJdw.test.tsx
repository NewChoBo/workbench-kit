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

  it('returns null for semantically invalid JDW JSON', () => {
    expect(
      renderJdw(
        JSON.stringify({
          type: 'grid',
          args: {
            children: [],
          },
        }),
      ),
    ).toBeNull();
  });

  it('renders resolved JDW variable values before validation and layout', () => {
    const markup = renderToStaticMarkup(
      <>
        {renderJdw(
          JSON.stringify({
            type: 'text',
            args: {
              text: '${title}',
              fontSize: '${fontSize}',
            },
          }),
          {
            values: {
              title: 'Dynamic title',
              fontSize: 22,
            },
          },
        )}
      </>,
    );

    expect(markup).toContain('Dynamic title');
    expect(markup).toContain('font-size:22px');
  });
});
