import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createNodeJsonLinesStore } from './json-lines-store.js';

describe('createNodeJsonLinesStore', () => {
  const fixtures: string[] = [];

  afterEach(async () => {
    await Promise.all(
      fixtures.splice(0).map((fixtureRoot) => rm(fixtureRoot, { recursive: true, force: true })),
    );
  });

  async function createFixtureRoot(): Promise<string> {
    const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'wbk-jsonl-'));
    fixtures.push(fixtureRoot);
    return fixtureRoot;
  }

  it('appends and reads JSON lines', async () => {
    const root = await createFixtureRoot();
    const store = createNodeJsonLinesStore<{ id: number }>({
      rootPath: root,
      relativeKey: 'logs/items.jsonl',
    });

    await store.append({ id: 1 });
    await store.append({ id: 2 });

    await expect(store.readAll()).resolves.toEqual({
      values: [{ id: 1 }, { id: 2 }],
    });
  });

  it('quarantines the whole file on a corrupt line and resumes empty', async () => {
    const root = await createFixtureRoot();
    await mkdir(path.join(root, 'logs'), { recursive: true });
    await writeFile(path.join(root, 'logs', 'items.jsonl'), '{"id":1}\n{bad\n', 'utf8');

    const store = createNodeJsonLinesStore<{ id: number }>({
      rootPath: root,
      relativeKey: 'logs/items.jsonl',
    });

    const result = await store.readAll();
    expect(result.values).toEqual([]);
    expect(result.diagnostic?.code).toBe('malformed_json');
    expect(result.diagnostic?.message.includes(path.resolve(root))).toBe(false);

    await store.append({ id: 9 });
    await expect(store.readAll()).resolves.toEqual({ values: [{ id: 9 }] });
  });
});
