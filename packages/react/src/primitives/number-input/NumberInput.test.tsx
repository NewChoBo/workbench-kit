import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { NumberInput } from './NumberInput';

describe('NumberInput', () => {
  it('renders themed steppers and hides native spin ownership on the field', () => {
    const markup = renderToStaticMarkup(
      <NumberInput
        aria-label="Gap"
        controlWidth="full"
        value={12}
        onValueChange={() => undefined}
      />,
    );

    expect(markup).toContain('ui-number-input');
    expect(markup).toContain('ui-number-input__spinners');
    expect(markup).toContain('ui-number-input__field');
    expect(markup).toContain('aria-label="Increment"');
    expect(markup).toContain('aria-label="Decrement"');
    expect(markup).toContain('type="number"');
    expect(markup).toContain('value="12"');
  });

  it('supports nullable empty values', () => {
    const onValueChange = vi.fn();
    const onEmptyValue = vi.fn();
    const markup = renderToStaticMarkup(
      <NumberInput
        aria-label="Padding"
        controlWidth="full"
        nullable
        value={undefined}
        onEmptyValue={onEmptyValue}
        onValueChange={onValueChange}
      />,
    );

    expect(markup).toContain('value=""');
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onEmptyValue).not.toHaveBeenCalled();
  });
});
