import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SegmentedControl } from './WorkbenchEditor';

describe('SegmentedControl', () => {
  it('renders an attached button group with pressed selection', () => {
    const markup = renderToStaticMarkup(
      <SegmentedControl
        ariaLabel="Library view mode"
        compact
        options={[
          { label: 'Grid', value: 'grid', testId: 'view-grid' },
          { label: 'List', value: 'list', testId: 'view-list' },
        ]}
        value="grid"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain(
      'class="ui-button-group ui-segmented-control ui-segmented-control--compact"',
    );
    expect(markup).toContain('aria-label="Library view mode"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('ui-segmented-control__item--selected');
    expect(markup).toContain('data-testid="view-grid"');
    expect(markup).toContain('data-testid="view-list"');
  });

  it('sets per-option aria-label for icon-only segments', () => {
    const markup = renderToStaticMarkup(
      <SegmentedControl
        ariaLabel="Catalog view mode"
        compact
        options={[
          { ariaLabel: 'Grid', label: <span className="codicon codicon-layout" />, value: 'grid' },
          {
            ariaLabel: 'List',
            label: <span className="codicon codicon-list-flat" />,
            value: 'list',
          },
        ]}
        value="grid"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="Grid"');
    expect(markup).toContain('aria-label="List"');
    expect(markup).not.toContain('>Grid<');
    expect(markup).not.toContain('>List<');
  });

  it('disables every segment when the control is disabled', () => {
    const markup = renderToStaticMarkup(
      <SegmentedControl
        ariaLabel="Mode"
        disabled
        options={[
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
        ]}
        value="a"
        onChange={() => undefined}
      />,
    );

    expect(markup.match(/\sdisabled(=|"|\s|>)/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('re-exports from primitives entry without import cycle', async () => {
    const entry = await import('..');
    const module = await import('./index');

    expect(entry.SegmentedControl).toBe(module.SegmentedControl);
    expect(entry.ButtonGroup).toBe(module.ButtonGroup);
  });
});
