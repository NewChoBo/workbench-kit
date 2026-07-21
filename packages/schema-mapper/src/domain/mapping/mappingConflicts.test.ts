import { describe, expect, it } from 'vitest';
import { sourceFieldsFromPlainObject } from '../ingest/sourceFieldsFromPlainObject.js';
import { targetSlotsFromPlainObject } from '../ingest/targetSlotsFromPlainObject.js';
import { findParentChildMappingConflicts } from './mappingConflicts.js';

describe('findParentChildMappingConflicts', () => {
  const sources = sourceFieldsFromPlainObject(
    { profile: { city: 'X' }, tags: [{ name: 'a' }] },
    { idPrefix: 'a' },
  );
  const targets = targetSlotsFromPlainObject(
    { location: { city: '' }, labels: [{ title: '' }] },
    { idPrefix: 'b' },
  );

  it('flags parent object + child leaf on the same side', () => {
    const conflicts = findParentChildMappingConflicts(
      [
        {
          id: 'p',
          sourceFieldId: 'a.profile',
          targetSlotId: 'b.location',
        },
        {
          id: 'c',
          sourceFieldId: 'a.profile.city',
          targetSlotId: 'b.location.city',
        },
      ],
      sources,
      targets,
    );

    expect(conflicts.some((item) => item.kind === 'parent-child-source')).toBe(true);
    expect(conflicts.some((item) => item.kind === 'parent-child-target')).toBe(true);
  });
});
