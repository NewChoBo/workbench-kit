import { describe, expect, it } from 'vitest';

import { createWidgetDocument } from '../document/document.js';
import { compileScreenSpecToJson } from '../screen-spec/compile.js';
import {
  screenColumn,
  screenExpanded,
  screenPanel,
  screenRow,
  screenText,
} from '../screen-spec/builders.js';
import { layoutWidget } from './layout-widget.js';

describe('outside-in column with explicit flex sibling', () => {
  it('keeps header intrinsic and gives remaining height to flex child', () => {
    const json = compileScreenSpecToJson({
      id: 'fill',
      title: 'Fill',
      description: '',
      frameWidth: 400,
      layout: { maxWidth: 400, maxHeight: 720 },
      root: screenColumn(
        [
          screenRow([screenText('Title', { fontSize: 22 })], { gap: 8 }),
          screenExpanded(screenRow([screenExpanded(screenPanel('Chart', '#111'))], { gap: 8 })),
        ],
        { gap: 16, padding: 20 },
      ),
    });
    const document = createWidgetDocument(json);
    expect(document.root).not.toBeNull();

    const registry = {
      definition(type: string) {
        if (type !== 'text') return undefined;
        return {
          measure: (widget: { text?: string; fontSize?: number }) => {
            const fontSize = widget.fontSize ?? 14;
            const text = widget.text ?? '';
            return {
              width: Math.max(fontSize, text.length * fontSize * 0.56),
              height: fontSize * 1.35,
            };
          },
        };
      },
    };

    const layout = layoutWidget(
      document.root!,
      { minWidth: 0, maxWidth: 401, minHeight: 0, maxHeight: 720 },
      { x: 0, y: 0 },
      { registry: registry as never },
    );

    expect(layout.children).toHaveLength(2);
    const header = layout.children[0]!;
    const chart = layout.children[1]!;
    expect(header.rect.height).toBeLessThan(80);
    expect(chart.rect.height).toBeGreaterThan(500);
  });
});
