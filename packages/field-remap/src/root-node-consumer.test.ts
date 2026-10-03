/// <reference types="node" />

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as sourceEntry from './index.js';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));

describe('field-remap public root consumption', () => {
  it('keeps source ESM exports and supplies built CommonJS and legacy Node type entries', () => {
    expect(packageJson.exports).toEqual({
      '.': {
        types: './dist/index.d.ts',
        import: './src/index.ts',
        require: './dist/index.cjs',
        default: './src/index.ts',
      },
      './history': './src/history.ts',
      './preview': './src/preview.ts',
      './data-operations': './src/registry/builtinDataOperations.ts',
      './json-data-operations': './src/registry/jsonDataOperations.ts',
      './utf8-data-operations': './src/registry/utf8DataOperations.ts',
    });
    expect(packageJson.main).toBe('./dist/index.cjs');
    expect(packageJson.types).toBe('./dist/index.d.ts');
    expect(packageJson.files).toContain('dist');
    expect(packageJson.files).toContain('src');
    expect(packageJson.files).toContain('!src/**/*.test.ts');

    for (const entry of [packageJson.main, packageJson.types]) {
      expect(
        existsSync(resolve(packageRoot, entry)),
        `Build contracts and field-remap before running the public root consumer test: ${entry}`,
      ).toBe(true);
    }
  });

  it('continues to resolve the public ESM import to the original source entry', async () => {
    const publicEntry = await import('@workbench-kit/field-remap');

    expect(publicEntry.convertToShape).toBe(sourceEntry.convertToShape);
    expect(publicEntry.createBuiltinValueTransformRegistry).toBe(
      sourceEntry.createBuiltinValueTransformRegistry,
    );
    expect(Object.keys(publicEntry).sort()).toEqual(Object.keys(sourceEntry).sort());
  });

  it('runs an array:first conversion from the built public root in plain CommonJS Node', () => {
    const stdout = execFileSync(
      process.execPath,
      [
        '--input-type=commonjs',
        '--eval',
        `
const remap = require('@workbench-kit/field-remap');
const source = { choices: ['first choice', 'second choice'] };
const shapes = [
  remap.defineDataShape({
    id: 'source',
    label: 'Source',
    role: 'source',
    fields: remap.sourceFieldsFromPlainObject(source, { idPrefix: 'source' }),
  }),
  remap.defineDataShape({
    id: 'target',
    label: 'Target',
    role: 'target',
    fields: remap.targetSlotsFromPlainObject({ selected: '' }, { idPrefix: 'target' }),
  }),
];
const conversion = remap.defineConversion({
  id: 'select-first',
  sourceShapeIds: ['source'],
  targetShapeId: 'target',
  edges: [{
    id: 'selection',
    sourceFieldId: 'source.choices',
    targetSlotId: 'target.selected',
    transformIds: ['array:first'],
  }],
});
remap.convertToShape({
  conversion,
  shapes,
  inputs: { source },
  transforms: remap.createBuiltinValueTransformRegistry(),
}).then((result) => {
  process.stdout.write(JSON.stringify({
    resolved: require.resolve('@workbench-kit/field-remap'),
    exports: Object.keys(remap).sort(),
    loadedModules: Object.keys(require.cache),
    result,
  }));
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
`,
      ],
      {
        cwd: packageRoot,
        encoding: 'utf8',
        env: { ...process.env, NODE_OPTIONS: '' },
        timeout: 10_000,
      },
    );
    const consumed = JSON.parse(stdout);

    expect(consumed.resolved).toBe(resolve(packageRoot, 'dist/index.cjs'));
    expect(consumed.exports).toEqual(Object.keys(sourceEntry).sort());
    expect(consumed.result).toEqual({
      output: { selected: 'first choice' },
      slots: [
        {
          edgeId: 'selection',
          targetSlotId: 'target.selected',
          path: 'selected',
          value: 'first choice',
        },
      ],
    });
    for (const loadedModule of consumed.loadedModules as string[]) {
      expect(loadedModule.replace(/\\/g, '/')).not.toMatch(
        /\/(?:react|react-dom|shell-react|monaco|jdw-editor)\//,
      );
    }
  });
});
