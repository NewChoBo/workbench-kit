import { mkdir, writeFile } from 'node:fs/promises';
import { URL } from 'node:url';

const distUrl = new URL('../dist/', import.meta.url);
await mkdir(distUrl, { recursive: true });
await writeFile(new URL('package.json', distUrl), '{"type":"commonjs"}\n', 'utf8');
