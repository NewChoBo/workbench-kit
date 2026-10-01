import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { isAbsolute, join } from 'node:path';
import type { WorkbenchLogSink } from './createWorkbenchLogger';

export type WorkbenchFileLogFailure = 'serialize' | 'oversize' | 'rotate' | 'append';
export interface WorkbenchFileLogSinkOptions {
  readonly directory: string;
  readonly fileName?: string;
  readonly maxFileBytes?: number;
  /** Includes the current file. */
  readonly maxFiles?: number;
  readonly maxRecordBytes?: number;
  readonly onFailure?: (reason: WorkbenchFileLogFailure) => void;
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(`Invalid ${label}.`);
  return value;
}

/** Synchronous, best-effort persistence; callers own data selection and a trusted directory. */
export function createWorkbenchFileLogSink(options: WorkbenchFileLogSinkOptions): WorkbenchLogSink {
  const { directory, onFailure } = options;
  const fileName = options.fileName ?? 'workbench.jsonl';
  if (!isAbsolute(directory)) throw new TypeError('Log directory must be absolute.');
  // Portable basenames also exclude alternate data streams and trailing dot/space aliases.
  if (
    !/^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/u.test(fileName) ||
    fileName.endsWith('.') ||
    /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(fileName)
  )
    throw new TypeError('Invalid log file basename.');
  const maxFileBytes = positiveInteger(options.maxFileBytes ?? 1_048_576, 'maxFileBytes');
  const maxFiles = positiveInteger(options.maxFiles ?? 3, 'maxFiles');
  const maxRecordBytes = positiveInteger(options.maxRecordBytes ?? 4096, 'maxRecordBytes');
  const file = (index: number) => join(directory, `${fileName}${index === 0 ? '' : `.${index}`}`);
  const fail = (reason: WorkbenchFileLogFailure) => {
    try {
      onFailure?.(reason);
    } catch {
      /* Diagnostics must never interrupt a caller. */
    }
  };
  const checkTarget = (target: string) => {
    try {
      const stat = lstatSync(target);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1)
        throw new Error('Unsafe log target.');
      return stat.size;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  };
  const openCurrent = () => {
    checkTarget(file(0));
    const fd = openSync(
      file(0),
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_APPEND |
        (constants.O_NOFOLLOW ?? 0) |
        (constants.O_NONBLOCK ?? 0),
      0o600,
    );
    try {
      const stat = fstatSync(fd);
      if (!stat.isFile() || stat.nlink !== 1) throw new Error('Unsafe open log target.');
      return { fd, size: stat.size };
    } catch (error) {
      closeSync(fd);
      throw error;
    }
  };
  let writing = false;
  return {
    write(event) {
      // A hostile serializer/failure callback must not recurse into this sink.
      if (writing) return;
      writing = true;
      let phase: WorkbenchFileLogFailure = 'serialize';
      let descriptor: number | undefined;
      try {
        const serialized = JSON.stringify(event);
        if (typeof serialized !== 'string') throw new Error('Unserializable event.');
        const bytes = Buffer.from(`${serialized}\n`, 'utf8');
        if (bytes.length > maxRecordBytes || bytes.length > maxFileBytes) {
          fail('oversize');
          return;
        }
        phase = 'append';
        mkdirSync(directory, { recursive: true });
        const directoryStat = lstatSync(directory);
        if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink())
          throw new Error('Unsafe log directory.');
        const verifyTargets = () => {
          for (let index = 0; index < maxFiles; index += 1) {
            phase = index === 0 ? 'append' : 'rotate';
            const size = checkTarget(file(index));
            if (size !== undefined && size > maxFileBytes) {
              phase = 'oversize';
              throw new Error('Existing log exceeds limit.');
            }
          }
        };
        verifyTargets();
        phase = 'append';
        let current = openCurrent();
        descriptor = current.fd;
        if (current.size > maxFileBytes) {
          phase = 'oversize';
          throw new Error('Existing log exceeds limit.');
        }
        if (current.size + bytes.length > maxFileBytes) {
          closeSync(descriptor);
          descriptor = undefined;
          phase = 'rotate';
          verifyTargets();
          phase = 'rotate';
          try {
            unlinkSync(file(maxFiles - 1));
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          }
          for (let index = maxFiles - 2; index >= 0; index -= 1) {
            try {
              renameSync(file(index), file(index + 1));
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            }
          }
          phase = 'append';
          current = openCurrent();
          descriptor = current.fd;
          if (current.size + bytes.length > maxFileBytes) throw new Error('Concurrent log writer.');
        }
        writeFileSync(descriptor, bytes);
      } catch {
        fail(phase);
      } finally {
        if (descriptor !== undefined) {
          try {
            closeSync(descriptor);
          } catch {
            fail('append');
          }
        }
        writing = false;
      }
    },
  };
}
