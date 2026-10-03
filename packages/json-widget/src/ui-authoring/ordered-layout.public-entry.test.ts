import { describe, expect, it } from 'vitest';

import * as orderedLayout from './ordered-layout.js';
import * as authoringV3 from './v3.js';
import type {
  UiContainerLayoutCommandV3Input,
  UiLayoutNodeProjectionV3Input,
  UiLayoutProjectionStrategy,
} from './v3.js';

describe('ordered layout V3 public entry', () => {
  it.each(['projectUiLayoutNodeV3', 'createUiContainerLayoutCommandV3'] as const)(
    'exports the canonical %s implementation',
    (name) => {
      expect(authoringV3[name]).toBe(orderedLayout[name]);
      expect(typeof authoringV3[name]).toBe('function');
    },
  );

  it('exposes consumer input and mapping types through the focused public entry', () => {
    const mapping: UiLayoutProjectionStrategy = {
      strategyId: 'canvas',
      mode: 'canvas',
      placementPropertyId: 'placement',
    };
    const input: UiLayoutNodeProjectionV3Input = {
      node: {
        id: 'root',
        type: 'text',
        $authoring: { component: { id: 'test:text', version: '1' }, properties: {} },
      },
      layoutProperties: [],
      layoutStrategies: [],
      strategies: [mapping],
      rootSize: { width: 120, height: 80 },
    };
    expect(authoringV3.projectUiLayoutNodeV3(input)).toMatchObject({
      id: 'root',
      type: 'text',
      width: 120,
      height: 80,
    });
    const command: UiContainerLayoutCommandV3Input = {
      nodeId: 'root',
      commandId: 'switch',
      currentLayout: undefined,
      targetStrategyId: 'unknown',
      containerValues: {},
      layoutProperties: [],
      layoutStrategies: [],
    };
    expect(authoringV3.createUiContainerLayoutCommandV3(command)).toBeNull();
  });
});
