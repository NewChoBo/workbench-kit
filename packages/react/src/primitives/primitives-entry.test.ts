import { describe, expect, it } from 'vitest';

import {
  ButtonGroup as entryButtonGroup,
  Chip as entryChip,
  isSearchableMultiSelectPortalTarget as entryIsSearchableMultiSelectPortalTarget,
  SearchableMultiSelect as entrySearchableMultiSelect,
  SegmentedControl as entrySegmentedControl,
  Select as entrySelect,
} from './index';
import { Chip as moduleChip } from './chip';
import {
  isSearchableMultiSelectPortalTarget as moduleIsSearchableMultiSelectPortalTarget,
  SearchableMultiSelect as moduleSearchableMultiSelect,
} from './searchable-multi-select';
import { Select as moduleSelect } from './select';
import {
  ButtonGroup as moduleButtonGroup,
  SegmentedControl as moduleSegmentedControl,
} from './workbench-editor';

describe('primitives entry', () => {
  it('re-exports selected primitives without an import cycle', () => {
    expect(entryChip).toBe(moduleChip);
    expect(entrySelect).toBe(moduleSelect);
    expect(entrySearchableMultiSelect).toBe(moduleSearchableMultiSelect);
    expect(entryIsSearchableMultiSelectPortalTarget).toBe(
      moduleIsSearchableMultiSelectPortalTarget,
    );
    expect(entrySegmentedControl).toBe(moduleSegmentedControl);
    expect(entryButtonGroup).toBe(moduleButtonGroup);
  });
});
