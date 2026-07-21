import { describe, expect, it } from 'vitest';

import {
  filterWorkbenchContributionsByWhenClause,
  WorkbenchWhenClauseSyntaxError,
} from '../index.js';

describe('context key contribution filters', () => {
  it('filters contributions with workbench when clauses', () => {
    const contributions = [
      { id: 'always' },
      { id: 'enabled', when: 'feature.enabled' },
      { id: 'hidden', when: 'feature.hidden' },
      { id: 'matchingView', when: 'view == providers.steam' },
    ];

    expect(
      filterWorkbenchContributionsByWhenClause(contributions, {
        'feature.enabled': true,
        'feature.hidden': false,
        view: 'providers.steam',
      }).map((contribution) => contribution.id),
    ).toEqual(['always', 'enabled', 'matchingView']);
  });

  it('surfaces invalid contribution when clauses', () => {
    expect(() =>
      filterWorkbenchContributionsByWhenClause([{ id: 'bad', when: 'feature.count >= 1' }], {
        'feature.count': 1,
      }),
    ).toThrow(WorkbenchWhenClauseSyntaxError);
  });
});
