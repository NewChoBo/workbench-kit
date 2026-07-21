import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { quarantineFileUnderRoot } from './quarantine.js';

describe('quarantineFileUnderRoot', () => {
  const fixtures: string[] = [];

  afterEach(async () => {
    await Promise.all(
      fixtures.splice(0).map((fixtureRoot) => rm(fixtureRoot, { recursive: true, force: true })),
    );
  });

  async function createFixtureRoot(): Promise<string> {
    const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'wbk-quarantine-'));
    fixtures.push(fixtureRoot);
    return fixtureRoot;
  }

  it('moves the file under recovery/quarantine and returns a root-relative key', async () => {
    const root = await createFixtureRoot();
    const sourcePath = path.join(root, 'state', 'window.json');
    await mkdir(path.dirname(sourcePath), { recursive: true });
    await writeFile(sourcePath, '{bad', 'utf8');

    const result = await quarantineFileUnderRoot({
      rootPath: root,
      absoluteFilePath: sourcePath,
      now: () => new Date('2026-07-21T12:00:00.000Z'),
      createId: () => 'fixed-id',
    });

    expect(result.quarantineKey).toBe(
      'recovery/quarantine/window.json.2026-07-21T12-00-00-000Z.fixed-id.quarantine',
    );
    expect(result.quarantineKey.includes(path.resolve(root))).toBe(false);

    const quarantinedAbsolute = path.join(root, ...result.quarantineKey.split('/'));
    expect(await readFile(quarantinedAbsolute, 'utf8')).toBe('{bad');
  });

  it('rejects paths that escape the root', async () => {
    const root = await createFixtureRoot();
    await expect(
      quarantineFileUnderRoot({
        rootPath: root,
        absoluteFilePath: path.join(root, '..', 'escape.json'),
      }),
    ).rejects.toThrow(/Path escapes/);
  });
});
