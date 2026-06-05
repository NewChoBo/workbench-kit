import { describe, expect, it } from 'vitest';
import { cxCodicon, getCodiconClassName } from './codicon';

describe('codicon utils', () => {
  it('normalizes optional codicon names without duplicating the prefix', () => {
    expect(getCodiconClassName('add')).toBe('codicon-add');
    expect(getCodiconClassName('codicon-add')).toBe('codicon-add');
    expect(getCodiconClassName('  chevron-down  ')).toBe('codicon-chevron-down');
    expect(getCodiconClassName('')).toBeUndefined();
    expect(getCodiconClassName(undefined)).toBeUndefined();
  });

  it('combines the codicon classes with local class names', () => {
    expect(cxCodicon('add', 'ui-action__icon')).toBe('codicon codicon-add ui-action__icon');
    expect(cxCodicon('codicon-add', false, 'ui-action__icon')).toBe(
      'codicon codicon-add ui-action__icon',
    );
    expect(cxCodicon(undefined, 'ui-action__icon')).toBe('ui-action__icon');
  });
});
