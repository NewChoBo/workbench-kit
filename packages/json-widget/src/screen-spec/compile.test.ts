import { describe, expect, it } from 'vitest';

import { parseJsonWidgetData } from '../jdw-node.js';
import { validateJsonWidgetData } from '../validate-json-widget-data.js';
import {
  screenColumn,
  screenExpanded,
  screenGrid,
  screenPanel,
  screenRow,
  screenText,
} from './builders.js';
import { compileScreenSpecToJson } from './compile.js';
import type { JdwScreenSpec } from './types.js';

const muted = { color: '#9aa0a6' };

describe('compileScreenSpecToJson', () => {
  it('compiles a screen spec into valid JDW JSON', () => {
    const spec: JdwScreenSpec = {
      id: 'demo',
      title: 'Demo',
      description: 'Demo screen',
      frameWidth: 400,
      layout: { maxWidth: 400, maxHeight: 200 },
      root: screenColumn(
        [
          screenText('Title', { fontSize: 18, color: '#e8eaed' }),
          screenRow(
            [screenExpanded(screenPanel('Left')), screenExpanded(screenPanel('Right'), 2)],
            {
              gap: 8,
            },
          ),
        ],
        { gap: 12, padding: 16, background: '#13151a' },
      ),
    };

    const json = compileScreenSpecToJson(spec);
    const parsed = parseJsonWidgetData(json);
    expect(parsed.parseError).toBeNull();
    expect(validateJsonWidgetData(json).valid).toBe(true);
    expect(json).toContain('"type": "expanded"');
  });

  it('preserves grid placement on compiled children', () => {
    const spec: JdwScreenSpec = {
      id: 'grid',
      title: 'Grid',
      description: 'Grid placement',
      frameWidth: 320,
      layout: { maxWidth: 320, maxHeight: 200 },
      root: screenGrid(2, [
        { ...screenText('A'), col: 0, row: 0 },
        { ...screenText('B'), col: 1, row: 0 },
        { ...screenText('Wide', { ...muted }), col: 0, row: 1, colSpan: 2 },
      ]),
    };

    const json = compileScreenSpecToJson(spec);
    expect(json).toContain('"colSpan": 2');
    expect(validateJsonWidgetData(json).valid).toBe(true);
  });
});
