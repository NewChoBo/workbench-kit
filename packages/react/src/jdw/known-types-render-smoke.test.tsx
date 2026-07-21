import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  WORKBENCH_JDW_KNOWN_TYPE_FIXTURES,
  WORKBENCH_JDW_KNOWN_TYPES,
  formatJsonWidgetData,
  wrapWorkbenchJdwKnownTypeFixture,
} from '@workbench-kit/jdw';

import { JdwPreview } from './JdwPreview.js';
import { renderJdw, renderJdwNode } from './renderJdw.js';

describe('known JDW types JSON → render smoke (JD-5)', () => {
  it.each(WORKBENCH_JDW_KNOWN_TYPES)(
    'renderJdw draws minimal %s fixture without throwing',
    (type) => {
      const node = wrapWorkbenchJdwKnownTypeFixture(WORKBENCH_JDW_KNOWN_TYPE_FIXTURES[type]);
      const source = formatJsonWidgetData(node);

      const fromSource = renderJdw(source);
      expect(fromSource).not.toBeNull();
      const markup = renderToStaticMarkup(<>{fromSource}</>);
      expect(markup).toContain('data-css-render-root="true"');
      expect(markup.length).toBeGreaterThan(0);

      const fromNode = renderJdwNode(node);
      expect(fromNode).not.toBeNull();
      expect(renderToStaticMarkup(<>{fromNode}</>)).toContain('data-css-render-root="true"');
    },
  );

  it.each(WORKBENCH_JDW_KNOWN_TYPES)(
    'JdwPreview draws minimal %s fixture without throwing',
    (type) => {
      const node = wrapWorkbenchJdwKnownTypeFixture(WORKBENCH_JDW_KNOWN_TYPE_FIXTURES[type]);
      const source = formatJsonWidgetData(node);

      const markup = renderToStaticMarkup(<JdwPreview json={source} />);
      expect(markup).toContain('data-testid="jdw-preview-output"');
      expect(markup).toContain('data-css-render-root="true"');
    },
  );
});
