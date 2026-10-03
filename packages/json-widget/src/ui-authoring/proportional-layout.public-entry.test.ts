import { describe, expect, it } from 'vitest';
import * as projection from './proportional-layout.js';
import * as authoring from './v3.js';
import type {
  UiProportionalLayoutNodeProjectionV3Input,
  UiProportionalLayoutProjectionStrategy,
} from './v3.js';

describe('proportional V3 public entry', () => {
  it('exports the canonical implementation and public input types', () => {
    expect(authoring.projectUiProportionalLayoutNodeV3).toBe(
      projection.projectUiProportionalLayoutNodeV3,
    );
    const mapping: UiProportionalLayoutProjectionStrategy = {
      strategyId: 'overlay',
      mode: 'overlay',
      placementPropertyId: 'placement',
    };
    const input: UiProportionalLayoutNodeProjectionV3Input = {
      node: {
        id: 'root',
        type: 'text',
        $authoring: { component: { id: 'test:text', version: '1' }, properties: {} },
      },
      rootSize: { width: 90, height: 60 },
      layoutProperties: [],
      layoutStrategies: [],
      strategies: [mapping],
    };
    expect(authoring.projectUiProportionalLayoutNodeV3(input)).toMatchObject({
      id: 'root',
      width: 90,
      height: 60,
    });
    expect(typeof authoring.projectUiLayoutNodeV3).toBe('function');
  });
});
