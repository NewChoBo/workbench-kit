import { rm } from 'node:fs/promises';
import { URL } from 'node:url';
import process from 'node:process';

if (process.env.WORKBENCH_KIT_WATCH !== '1')
  await rm(new URL('../dist/', import.meta.url), { force: true, recursive: true });
