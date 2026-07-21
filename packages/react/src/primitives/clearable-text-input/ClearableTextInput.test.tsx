import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ClearableTextInput } from './ClearableTextInput';

describe('ClearableTextInput', () => {
  it('renders an inline clear button when the input has a value', () => {
    const markup = renderToStaticMarkup(
      <ClearableTextInput aria-label="Search workspace" clearLabel="Clear search" value="button" />,
    );

    expect(markup).toContain('ui-clearable-text-input');
    expect(markup).toContain('ui-clearable-text-input__input');
    expect(markup).toContain('aria-label="Clear search"');
  });

  it('hides the clear button for empty values', () => {
    const markup = renderToStaticMarkup(
      <ClearableTextInput aria-label="Search workspace" clearLabel="Clear search" value="" />,
    );

    expect(markup).not.toContain('aria-label="Clear search"');
  });
});
