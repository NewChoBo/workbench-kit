import { describe, expect, it } from 'vitest';

import {
  createResourceIdentity,
  createResourceIdentityKey,
  isSameResourceUri,
  normalizeResourceUri,
} from './uri';

describe('resource URI contracts', () => {
  it('normalizes generic resource URIs and rejects values without a scheme', () => {
    expect(normalizeResourceUri(' workbench-resource://document/home ')).toBe(
      'workbench-resource://document/home',
    );
    expect(normalizeResourceUri(' sample-source:/documents/main.json ')).toBe(
      'sample-source:/documents/main.json',
    );
    expect(() => normalizeResourceUri('launchpads/home')).toThrow(/scheme/);
    expect(() => normalizeResourceUri('   ')).toThrow(/required/);
  });

  it('creates stable identity keys', () => {
    expect(createResourceIdentity('workbench-resource://document/home')).toEqual({
      key: 'workbench-resource://document/home',
      uri: 'workbench-resource://document/home',
    });
    expect(createResourceIdentityKey('sample-source:/documents/main.json')).toBe(
      'sample-source:/documents/main.json',
    );
    expect(
      isSameResourceUri(
        'workbench-resource://document/home',
        ' workbench-resource://document/home ',
      ),
    ).toBe(true);
    expect(
      isSameResourceUri(
        ' sample-source:/documents/main.json ',
        'sample-source:/documents/main.json',
      ),
    ).toBe(true);
  });
});
