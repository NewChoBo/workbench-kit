import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Select } from './Select';

describe('Select', () => {
  it('renders combobox trigger and native select', () => {
    const markup = renderToStaticMarkup(
      <Select aria-label="Status" defaultValue="open">
        <option value="open">Open</option>
        <option value="closed">Closed</option>
      </Select>,
    );

    expect(markup).toContain('class="ui-select"');
    expect(markup).toContain('role="combobox"');
    expect(markup).toContain('aria-label="Status"');
    expect(markup).toContain('class="ui-select__trigger"');
    expect(markup).toContain('class="ui-select__native"');
    expect(markup).toContain('value="open"');
    expect(markup).toContain('Open</option>');
    expect(markup).toContain('aria-expanded="false"');
  });

  it('re-exports from primitives entry without import cycle', async () => {
    const entry = await import('../Select');
    const module = await import('./index');

    expect(entry.Select).toBe(module.Select);
  });
});
