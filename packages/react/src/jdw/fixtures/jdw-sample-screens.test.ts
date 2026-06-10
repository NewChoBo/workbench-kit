import { describe, expect, it } from 'vitest';
import { parseJsonWidgetData, validateJsonWidgetData } from '@workbench-kit/jdw';

import { formatJdwSampleScreenJson, JDW_SAMPLE_SCREENS } from './jdw-sample-screens.js';

describe('jdw-sample-screens', () => {
  it('parses and validates every sample screen fixture', () => {
    for (const sample of JDW_SAMPLE_SCREENS) {
      const json = formatJdwSampleScreenJson(sample);
      const parsed = parseJsonWidgetData(json);
      expect(parsed.parseError, sample.id).toBeNull();
      expect(parsed.value, sample.id).not.toBeNull();

      const validated = validateJsonWidgetData(json);
      expect(validated.valid, `${sample.id}: ${validated.issues.map((issue) => issue.message).join(', ')}`).toBe(
        true,
      );
    }
  });
});
