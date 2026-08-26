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

  it('forwards invalid state to the visible combobox trigger', () => {
    const markup = renderToStaticMarkup(
      <Select id="status" aria-describedby="status-error" aria-invalid="true" defaultValue="open">
        <option value="open">Open</option>
      </Select>,
    );
    const trigger = markup.match(/<button[^>]*>/)?.[0];
    const nativeSelect = markup.match(/<select[^>]*>/)?.[0];

    expect(trigger).toContain('id="status"');
    expect(trigger).toContain('aria-describedby="status-error"');
    expect(trigger).toContain('aria-invalid="true"');
    expect(nativeSelect).toContain('aria-invalid="true"');
  });
});
