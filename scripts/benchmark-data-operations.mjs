import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { transformWithEsbuild } from 'vite';

// Optional source paths allow alternating baseline/candidate batches in one process.
// Transpilation and runner creation are excluded from the measured interval.
const paths = process.argv.slice(2);
if (!paths.length) paths.push('packages/runtime/src/dataOperations.ts');
const iterations = 20000;
const samples = 15;
const fixtures = [];
for (const path of paths) {
  const { code } = await transformWithEsbuild(await readFile(path, 'utf8'), path, {
    loader: 'ts',
    target: 'es2022',
  });
  const { createDataOperationRunner } = await import(
    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  );
  const sync = { id: 'bench:sync', version: 1 };
  const asyncRef = { id: 'bench:async', version: 1 };
  const nested = { id: 'bench:nested', version: 1 };
  const define = (ref, execute) => ({
    ref,
    acceptsInput: (value) => typeof value === 'string',
    acceptsOutput: (value) => typeof value === 'string',
    execute,
  });
  const runner = createDataOperationRunner([
    define(sync, (value) => value.trim()),
    define(asyncRef, async (value) => value.trim()),
    define(nested, async (value, context) => {
      const first = await context.invoke(sync, value, 'first');
      return context.invoke(sync, first, 'second');
    }),
  ]);
  for (const [name, ref, maxInvocations] of [
    ['single', sync, 1],
    ['async', asyncRef, 1],
    ['nested-three', nested, 3],
  ]) {
    const options = { maxInvocations, location: ['benchmark'] };
    fixtures.push({
      path,
      name,
      times: [],
      async batch(count) {
        const start = performance.now();
        let valid = 0;
        for (let index = 0; index < count; index++) {
          const result = await runner.run(ref, '  value  ', options);
          if (result.ok && result.value === 'value') valid++;
        }
        const elapsed = performance.now() - start;
        assert.equal(valid, count);
        return elapsed;
      },
    });
  }
}
for (const fixture of fixtures) await fixture.batch(10000);
for (let sample = 0; sample < samples; sample++) {
  const order = sample % 2 ? [...fixtures].reverse() : fixtures;
  for (const fixture of order) fixture.times.push(await fixture.batch(iterations));
}
console.log(
  JSON.stringify(
    {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpu: cpus()[0]?.model,
      iterations,
      samples,
      warmup: 10000,
      results: fixtures.map(({ path, name, times }) => {
        const sorted = [...times].sort((a, b) => a - b);
        return {
          path,
          name,
          medianMs: sorted[Math.floor(samples / 2)],
          p95Ms: sorted[Math.ceil(samples * 0.95) - 1],
          batchesMs: times,
        };
      }),
    },
    null,
    2,
  ),
);
