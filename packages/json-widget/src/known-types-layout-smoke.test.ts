import { describe, expect, it } from 'vitest';

import { formatJsonWidgetData, jdwNodeToGenericWidget } from './jdw-node.js';
import {
  WORKBENCH_JDW_KNOWN_TYPE_FIXTURES,
  wrapWorkbenchJdwKnownTypeFixture,
} from './known-type-fixtures.js';
import { WORKBENCH_JDW_KNOWN_TYPES } from './jdw-profile.js';
import { layoutWidget } from './layout/layout-widget.js';
import { validateJsonWidgetData } from './validate-json-widget-data.js';

describe('known JDW types JSON → layout smoke', () => {
  it.each(WORKBENCH_JDW_KNOWN_TYPES)('validates and lays out minimal %s fixture', (type) => {
    const node = WORKBENCH_JDW_KNOWN_TYPE_FIXTURES[type];
    expect(node.type).toBe(type);

    const source = formatJsonWidgetData(node);
    const validated = validateJsonWidgetData(source, { strictKnownTypes: true });
    expect(validated.valid, validated.issues.map((issue) => issue.message).join('; ')).toBe(true);

    const layoutRoot = jdwNodeToGenericWidget(wrapWorkbenchJdwKnownTypeFixture(node));
    const layout = layoutWidget(layoutRoot, {
      minWidth: 0,
      maxWidth: 320,
      minHeight: 0,
      maxHeight: 240,
    });

    expect(layout.rect.width).toBeGreaterThanOrEqual(0);
    expect(layout.rect.height).toBeGreaterThanOrEqual(0);
    if (type === 'expanded' || type === 'flexible') {
      expect(layout.widget.type).toBe('row');
      expect(layout.children).toHaveLength(1);
    } else {
      expect(layout.widget.type).toBe(type);
    }
  });
});
