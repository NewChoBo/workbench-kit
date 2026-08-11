import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { atomicWriteBytes, atomicWriteText } from './atomic-write.js';

describe('atomic writes', () => {
  const fixtures: string[] = [];

  afterEach(async () => {
    await Promise.all(
      fixtures.splice(0).map((fixtureRoot) => rm(fixtureRoot, { recursive: true, force: true })),
    );
  });

  async function createFixtureRoot(): Promise<string> {
    const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'wbk-atomic-write-'));
    fixtures.push(fixtureRoot);
    return fixtureRoot;
  }

  function listTempSiblings(directory: string, targetBasename: string): Promise<string[]> {
    return readdir(directory).then((entries) =>
      entries.filter((entry) => entry.startsWith(`.${targetBasename}.`) && entry.endsWith('.tmp')),
    );
  }

  it('writes the final file and leaves no leftover temps', async () => {
    const fixtureRoot = await createFixtureRoot();
    const nestedDirectory = path.join(fixtureRoot, 'nested', 'dir');
    const filePath = path.join(nestedDirectory, 'document.json');

    await atomicWriteText(filePath, '{"ok":true}');

    expect(await readFile(filePath, 'utf8')).toBe('{"ok":true}');
    expect(await listTempSiblings(nestedDirectory, 'document.json')).toEqual([]);
  });

  it('writes binary bytes without text conversion', async () => {
    const fixtureRoot = await createFixtureRoot();
    const filePath = path.join(fixtureRoot, 'asset.bin');
    const contents = Uint8Array.from([0, 1, 127, 128, 255]);

    await atomicWriteBytes(filePath, contents);

    expect(await readFile(filePath)).toEqual(Buffer.from(contents));
    expect(await listTempSiblings(fixtureRoot, 'asset.bin')).toEqual([]);
  });

  it('cleans the temp file and keeps the target when rename throws', async () => {
    const fixtureRoot = await createFixtureRoot();
    const filePath = path.join(fixtureRoot, 'settings.json');
    await writeFile(filePath, '{"version":1}', 'utf8');

    await expect(
      atomicWriteText(filePath, '{"version":2}', {
        renameFile: async () => {
          throw new Error('injected rename failure');
        },
      }),
    ).rejects.toThrow('injected rename failure');

    expect(await readFile(filePath, 'utf8')).toBe('{"version":1}');
    expect(await listTempSiblings(fixtureRoot, 'settings.json')).toEqual([]);
  });
});
