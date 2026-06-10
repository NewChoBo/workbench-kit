import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { parseJsonWidgetData } from '@workbench-kit/json-widget';

import { JDW_FIXTURE_ROW_FLEX } from './fixtures/jdw-fixtures.js';
import { renderJsonWidgetWithLayout } from './cssRenderBackend.js';

describe('cssRenderBackend', () => {
  it('positions row flex children using layout rects', () => {
    const parsed = parseJsonWidgetData(JDW_FIXTURE_ROW_FLEX);
    expect(parsed.value).not.toBeNull();

    const markup = renderToStaticMarkup(
      <>{renderJsonWidgetWithLayout(parsed.value!, { layoutConstraints: { minWidth: 0, maxWidth: 300, minHeight: 0, maxHeight: 120 } })}</>,
    );

    expect(markup).toContain('data-css-render-root="true"');
    expect(markup).toContain('Left');
    expect(markup).toContain('Right (flex 2)');
  });
});
