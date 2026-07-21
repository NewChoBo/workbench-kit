import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createNodeJsonDocumentStore } from './json-document-store.js';

describe('createNodeJsonDocumentStore', () => {
  const fixtures: string[] = [];

  afterEach(async () => {
    await Promise.all(
      fixtures.splice(0).map((fixtureRoot) => rm(fixtureRoot, { recursive: true, force: true })),
    );
  });

  async function createFixtureRoot(): Promise<string> {
    const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'wbk-json-doc-'));
    fixtures.push(fixtureRoot);
    return fixtureRoot;
  }

  it('writes and reads a versioned document under the root', async () => {
    const root = await createFixtureRoot();
    const store = createNodeJsonDocumentStore<{ theme: string }>({
      rootPath: root,
      relativeKey: 'state/settings.json',
      kind: 'settings',
      schemaVersion: 1,
    });

    await store.write({ theme: 'dark' });

    const onDisk = JSON.parse(
      await readFile(path.join(root, 'state', 'settings.json'), 'utf8'),
    ) as unknown;
    expect(onDisk).toEqual({
      kind: 'settings',
      schemaVersion: 1,
      data: { theme: 'dark' },
    });
    await expect(store.read()).resolves.toEqual({ value: { theme: 'dark' } });
  });

  it('quarantines malformed JSON without leaking absolute paths', async () => {
    const root = await createFixtureRoot();
    const relativeKey = 'state/settings.json';
    await mkdir(path.join(root, 'state'), { recursive: true });
    await writeFile(path.join(root, 'state', 'settings.json'), '{bad', 'utf8');

    const store = createNodeJsonDocumentStore<{ theme: string }>({
      rootPath: root,
      relativeKey,
      kind: 'settings',
      schemaVersion: 1,
    });

    const result = await store.read();
    expect(result.value).toBeNull();
    expect(result.diagnostic?.code).toBe('malformed_json');
    expect(result.diagnostic?.relativeKey).toBe(relativeKey);
    expect(result.diagnostic?.message.includes(path.resolve(root))).toBe(false);
    expect(result.diagnostic?.message).toMatch(/Quarantined as recovery\/quarantine\//);

    const quarantineEntries = await readdir(path.join(root, 'recovery', 'quarantine'));
    expect(quarantineEntries).toHaveLength(1);
  });

  it('returns not_found when missing', async () => {
    const root = await createFixtureRoot();
    const store = createNodeJsonDocumentStore<{ theme: string }>({
      rootPath: root,
      relativeKey: 'missing.json',
      kind: 'settings',
      schemaVersion: 1,
    });

    await expect(store.read()).resolves.toEqual({
      value: null,
      diagnostic: {
        code: 'not_found',
        message: 'Document is not present.',
        relativeKey: 'missing.json',
      },
    });
  });
});
