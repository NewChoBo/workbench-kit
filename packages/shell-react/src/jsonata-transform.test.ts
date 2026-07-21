import { describe, expect, it } from 'vitest';
import { createValueTransformRegistry } from '@workbench-kit/field-remap';
import { JSONATA_TRANSFORM_ID, jsonataValueTransform } from './jsonata-transform.js';

describe('jsonataValueTransform', () => {
  it('evaluates expressions against the source value', () => {
    const registry = createValueTransformRegistry([jsonataValueTransform]);
    const result = registry.apply(
      JSONATA_TRANSFORM_ID,
      { tags: [{ name: 'math' }, { name: 'computing' }] },
      { options: { expression: 'tags.name' } },
    );
    // JSONata may return a sequence array; normalize for assertion.
    expect(Array.from(result as string[])).toEqual(['math', 'computing']);
  });
});
