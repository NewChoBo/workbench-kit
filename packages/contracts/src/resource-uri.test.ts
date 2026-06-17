import { describe, expect, it } from 'vitest';

import {
  createResourceIdentity,
  createResourceIdentityKey,
  isSameResourceUri,
  normalizeResourceUri,
} from './resource-uri';

describe('resource URI contracts', () => {
  it('normalizes generic resource URIs and rejects values without a scheme', () => {
    expect(normalizeResourceUri(' tilepaper-authoring://launchpad/home ')).toBe(
      'tilepaper-authoring://launchpad/home',
    );
    expect(normalizeResourceUri(' tilepaper-source:/launchpads/main.json ')).toBe(
      'tilepaper-source:/launchpads/main.json',
    );
    expect(() => normalizeResourceUri('launchpads/home')).toThrow(/scheme/);
    expect(() => normalizeResourceUri('   ')).toThrow(/required/);
  });

  it('creates stable identity keys', () => {
    expect(createResourceIdentity('tilepaper-authoring://launchpad/home')).toEqual({
      key: 'tilepaper-authoring://launchpad/home',
      uri: 'tilepaper-authoring://launchpad/home',
    });
    expect(createResourceIdentityKey('tilepaper-source:/launchpads/main.json')).toBe(
      'tilepaper-source:/launchpads/main.json',
    );
    expect(
      isSameResourceUri(
        'tilepaper-authoring://launchpad/home',
        ' tilepaper-authoring://launchpad/home ',
      ),
    ).toBe(true);
    expect(
      isSameResourceUri(
        ' tilepaper-source:/launchpads/main.json ',
        'tilepaper-source:/launchpads/main.json',
      ),
    ).toBe(true);
  });
});
