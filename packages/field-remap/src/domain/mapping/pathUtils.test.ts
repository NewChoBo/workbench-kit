import { describe, expect, it } from 'vitest';
import { InvalidObjectPathError, UnsafeObjectPathError } from './objectPathSafety.js';
import {
  applyStringTemplate,
  DEFAULT_MAX_PATH_WILDCARD_EXPANSION,
  isPlainObject,
  listArrayItemProjectionOptions,
  PathExpansionLimitError,
  projectCollectionItems,
  projectObjectPath,
  readObjectPath,
  writeObjectPath,
} from './pathUtils.js';

describe('pathUtils', () => {
  it('reads dotted object paths', () => {
    expect(readObjectPath({ meta: { label: 'A' } }, 'meta.label')).toBe('A');
    expect(readObjectPath({ name: 'wind' }, 'name')).toBe('wind');
    expect(readObjectPath(null, 'name')).toBeUndefined();
  });

  it('reads numeric index segments', () => {
    expect(readObjectPath({ items: [{ name: 'a' }, { name: 'b' }] }, 'items[1].name')).toBe('b');
    expect(readObjectPath({ items: ['x', 'y'] }, 'items[0]')).toBe('x');
    expect(readObjectPath({ items: [] }, 'items[0]')).toBeUndefined();
  });

  it('rejects wildcard reads on readObjectPath', () => {
    expect(() => readObjectPath({ items: [{ name: 'a' }] }, 'items[*].name')).toThrow(
      InvalidObjectPathError,
    );
  });

  it('projects wildcard and nested index paths', () => {
    expect(
      projectObjectPath(
        {
          items: [
            { name: 'wind', tags: ['a', 'b'] },
            { name: 'fog', tags: ['c'] },
          ],
        },
        'items[*].name',
      ),
    ).toEqual(['wind', 'fog']);

    expect(
      projectObjectPath(
        { items: [{ tags: [{ label: 'x' }, { label: 'y' }] }] },
        'items[0].tags[*].label',
      ),
    ).toEqual(['x', 'y']);
  });

  it('fails closed on incompatible wildcard containers', () => {
    expect(projectObjectPath({ items: 'nope' }, 'items[*].name')).toEqual([]);
    expect(projectObjectPath({ items: [{ name: 'a' }] }, 'missing[*].name')).toEqual([]);
  });

  it('enforces wildcard expansion limits', () => {
    const items = Array.from({ length: 5 }, (_, index) => ({ name: `n${index}` }));
    expect(() => projectObjectPath({ items }, 'items[*].name', { maxExpansion: 3 })).toThrow(
      PathExpansionLimitError,
    );
    expect(DEFAULT_MAX_PATH_WILDCARD_EXPANSION).toBe(1_000);
  });

  it('writes dotted and indexed object paths immutably', () => {
    const root = { display: { timeText: 'old' } };
    const next = writeObjectPath(root, 'display.condition', 'Clear');
    expect(next).toEqual({ display: { timeText: 'old', condition: 'Clear' } });
    expect(root).toEqual({ display: { timeText: 'old' } });
    expect(writeObjectPath(null, 'a.b', 1)).toEqual({ a: { b: 1 } });
    expect(writeObjectPath({}, 'items[1].name', 'b')).toEqual({
      items: [undefined, { name: 'b' }],
    });
  });

  it('rejects wildcard writes and dangerous segments', () => {
    expect(() => writeObjectPath({}, 'items[*].name', 'x')).toThrow(InvalidObjectPathError);
    expect(() => readObjectPath({}, '__proto__.polluted')).toThrow(UnsafeObjectPathError);
    expect(() => writeObjectPath({}, 'constructor.prototype.polluted', true)).toThrow(
      UnsafeObjectPathError,
    );
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('fills safe {path} templates without eval', () => {
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject([1])).toBe(false);

    expect(applyStringTemplate('{city} · {temp}', { city: 'Seoul', temp: 22 })).toBe('Seoul · 22');
    expect(applyStringTemplate('{meta.label}', { meta: { label: 'A' } })).toBe('A');
    expect(applyStringTemplate('{missing}', { city: 'X' })).toBe('');
    expect(applyStringTemplate('{foo bar}', { 'foo bar': 'nope' })).toBe('{foo bar}');
    // Wildcard placeholders are not matched by the template grammar (left unchanged).
    expect(applyStringTemplate('{items[*].name}', { items: [{ name: 'a' }] })).toBe(
      '{items[*].name}',
    );
  });

  it('projects array items through itemSourcePath', () => {
    expect(
      projectCollectionItems(
        [
          { name: 'wind', level: 2 },
          { name: 'fog', level: 1 },
        ],
        'name',
      ),
    ).toEqual(['wind', 'fog']);
    expect(projectCollectionItems(['a', 'b'], 'name')).toEqual([undefined, undefined]);
    expect(projectCollectionItems({ not: 'array' }, 'name')).toEqual({ not: 'array' });
    expect(
      projectCollectionItems(
        [{ tags: [{ id: 1 }, { id: 2 }] }, { tags: [{ id: 3 }] }],
        'tags[*].id',
      ),
    ).toEqual([[1, 2], [3]]);
  });

  it('lists projection options from children or sample keys', () => {
    expect(
      listArrayItemProjectionOptions({
        children: [
          { label: 'name', path: 'name', dataType: 'string' },
          { label: 'level', path: 'level', dataType: 'number' },
        ],
      }),
    ).toEqual([
      { path: 'name', label: 'name', dataType: 'string' },
      { path: 'level', label: 'level', dataType: 'number' },
    ]);

    expect(
      listArrayItemProjectionOptions({
        sampleValue: [{ code: 'x', severity: 1 }],
      }),
    ).toEqual([
      { path: 'code', label: 'code' },
      { path: 'severity', label: 'severity' },
    ]);
  });
});
