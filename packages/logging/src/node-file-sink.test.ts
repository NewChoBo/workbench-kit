import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  constants,
  chmodSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWorkbenchFileLogSink } from './node';
import type { WorkbenchLogEvent } from './index';

const roots: string[] = [];
const temp = () => {
  const root = mkdtempSync(join(tmpdir(), 'wbk-file-log-'));
  roots.push(root);
  return root;
};
const event = (data?: unknown): WorkbenchLogEvent => ({
  label: '[host]',
  level: 'info',
  message: 'ready',
  scope: 'host',
  timestamp: 1,
  data,
});
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('bounded Node file sink', () => {
  it('creates a missing directory and appends complete UTF-8 JSONL records', () => {
    const directory = join(temp(), 'logs');
    const sink = createWorkbenchFileLogSink({ directory });
    sink.write(event('한글'));
    sink.write(event('second'));
    expect(
      readFileSync(join(directory, 'workbench.jsonl'), 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line)),
    ).toEqual([event('한글'), event('second')]);
  });
  it('uses bytes including newline for record and file limits', () => {
    const directory = temp();
    const value = event('한');
    const size = Buffer.byteLength(JSON.stringify(value) + '\n');
    const failures = vi.fn();
    const sink = createWorkbenchFileLogSink({
      directory,
      maxRecordBytes: size,
      maxFileBytes: size,
      onFailure: failures,
    });
    sink.write(value);
    sink.write(value);
    sink.write(event('한한'));
    expect(failures).toHaveBeenCalledExactlyOnceWith('oversize');
    expect(readFileSync(join(directory, 'workbench.jsonl')).length).toBe(size);
    expect(readFileSync(join(directory, 'workbench.jsonl.1')).length).toBe(size);
  });
  it('rotates existing files to a bounded current plus numbered set', () => {
    const directory = temp();
    const line = JSON.stringify(event()) + '\n';
    for (const suffix of ['', '.1', '.2'])
      writeFileSync(join(directory, `workbench.jsonl${suffix}`), line);
    const sink = createWorkbenchFileLogSink({
      directory,
      maxFiles: 3,
      maxFileBytes: Buffer.byteLength(line),
    });
    for (let index = 0; index < 8; index += 1) sink.write(event());
    expect(readdirSync(directory).sort()).toEqual([
      'workbench.jsonl',
      'workbench.jsonl.1',
      'workbench.jsonl.2',
    ]);
    for (const file of readdirSync(directory))
      expect(readFileSync(join(directory, file)).length).toBe(Buffer.byteLength(line));
  });
  it('preserves every byte and filename when an existing reserved file exceeds the limit', () => {
    for (const suffix of ['', '.1', '.2']) {
      const directory = temp();
      writeFileSync(join(directory, `workbench.jsonl${suffix}`), 'x'.repeat(201));
      const before = readdirSync(directory).map((file) => [
        file,
        readFileSync(join(directory, file), 'utf8'),
      ]);
      const failures = vi.fn();
      const sink = createWorkbenchFileLogSink({
        directory,
        maxFileBytes: 200,
        onFailure: failures,
      });
      sink.write(event());
      sink.write(event());
      expect(failures.mock.calls).toEqual([['oversize'], ['oversize']]);
      expect(
        readdirSync(directory).map((file) => [file, readFileSync(join(directory, file), 'utf8')]),
      ).toEqual(before);
    }
  });
  it('keeps a single current file when maxFiles is one', () => {
    const directory = temp();
    const line = JSON.stringify(event()) + '\n';
    const sink = createWorkbenchFileLogSink({
      directory,
      maxFiles: 1,
      maxFileBytes: Buffer.byteLength(line),
    });
    sink.write(event());
    sink.write(event());
    expect(readdirSync(directory)).toEqual(['workbench.jsonl']);
  });
  it('isolates cyclic serialization and hostile failure callbacks', () => {
    const directory = temp();
    const data: Record<string, unknown> = {};
    data.self = data;
    const failures = vi.fn(() => {
      throw new Error('private failure detail');
    });
    const sink = createWorkbenchFileLogSink({ directory, onFailure: failures });
    expect(() => sink.write(event(data))).not.toThrow();
    expect(failures).toHaveBeenCalledExactlyOnceWith('serialize');
    sink.write(event());
    expect(readdirSync(directory)).toEqual(['workbench.jsonl']);
  });
  it('reports only static failure codes for a nonregular append target', () => {
    const directory = temp();
    mkdirSync(join(directory, 'workbench.jsonl'));
    const failures = vi.fn();
    const sink = createWorkbenchFileLogSink({ directory, onFailure: failures });
    expect(() => sink.write(event())).not.toThrow();
    expect(failures).toHaveBeenCalledExactlyOnceWith('append');
  });
  it('fails rotation before changing files when a numbered target is nonregular', () => {
    const directory = temp();
    const line = JSON.stringify(event()) + '\n';
    writeFileSync(join(directory, 'workbench.jsonl'), line);
    mkdirSync(join(directory, 'workbench.jsonl.1'));
    const failures = vi.fn();
    createWorkbenchFileLogSink({
      directory,
      maxFileBytes: Buffer.byteLength(line),
      onFailure: failures,
    }).write(event());
    expect(failures).toHaveBeenCalledExactlyOnceWith('rotate');
    expect(readFileSync(join(directory, 'workbench.jsonl'), 'utf8')).toBe(line);
  });
  it.skipIf(process.platform === 'win32' || !constants.O_NOFOLLOW)(
    'never changes the outside target behind current or rotation symlinks',
    () => {
      for (const suffix of ['', '.1']) {
        const directory = temp();
        const outside = join(temp(), 'outside');
        writeFileSync(outside, 'unchanged');
        if (suffix)
          writeFileSync(join(directory, 'workbench.jsonl'), JSON.stringify(event()) + '\n');
        symlinkSync(outside, join(directory, `workbench.jsonl${suffix}`));
        const failures = vi.fn();
        createWorkbenchFileLogSink({
          directory,
          maxFileBytes: Buffer.byteLength(JSON.stringify(event()) + '\n'),
          onFailure: failures,
        }).write(event());
        expect(readFileSync(outside, 'utf8')).toBe('unchanged');
        expect(failures).toHaveBeenCalledExactlyOnceWith(suffix ? 'rotate' : 'append');
      }
    },
  );
  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
    'isolates permission failures during append and rotation',
    () => {
      for (const existing of [false, true]) {
        const directory = temp();
        const line = JSON.stringify(event()) + '\n';
        if (existing) writeFileSync(join(directory, 'workbench.jsonl'), line);
        const failures = vi.fn();
        chmodSync(directory, 0o500);
        try {
          createWorkbenchFileLogSink({
            directory,
            maxFileBytes: Buffer.byteLength(line),
            onFailure: failures,
          }).write(event());
          expect(failures).toHaveBeenCalledExactlyOnceWith(existing ? 'rotate' : 'append');
        } finally {
          chmodSync(directory, 0o700);
        }
      }
    },
  );
  it('rejects unsafe configuration before any filesystem write', () => {
    for (const fileName of [
      '../escape',
      '.',
      '..',
      'a/b',
      'a\\b',
      'bad:stream',
      '',
      'CON',
      'nul.jsonl',
      'Aux',
      'PRN.txt',
      'COM1.jsonl',
      'LPT9',
    ])
      expect(() => createWorkbenchFileLogSink({ directory: temp(), fileName })).toThrow();
    expect(() => createWorkbenchFileLogSink({ directory: 'relative' })).toThrow();
    for (const maxFiles of [0, -1, 1.5, Infinity])
      expect(() => createWorkbenchFileLogSink({ directory: temp(), maxFiles })).toThrow();
  });
});
