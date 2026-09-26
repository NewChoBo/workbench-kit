import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { validateRegistry, verifyReport } from './verification-units.mjs';

const root = process.cwd();
const file = 'scripts/verification-units.test.mjs';
const registry = {
  version: 1,
  units: [
    {
      id: 'gate',
      owner: 'verification',
      sources: ['scripts/verification-units.mjs'],
      tests: [{ file, cases: ['required behavior'] }],
    },
  ],
};
function report() {
  return {
    success: true,
    numTotalTests: 1,
    numFailedTests: 0,
    numPendingTests: 0,
    testResults: [
      {
        name: resolve(root, file),
        status: 'passed',
        assertionResults: [{ fullName: 'required behavior', status: 'passed' }],
      },
    ],
  };
}

describe('verification units', () => {
  it('accepts a real registry and complete passing report', () => {
    expect(validateRegistry(registry, root)).toBe(registry);
    expect(() => verifyReport(registry, report(), root)).not.toThrow();
  });
  it('ignores pending and todo cases outside registered evidence', () => {
    const withUnrelatedPendingAndTodo = report();
    withUnrelatedPendingAndTodo.numTotalTests = 3;
    withUnrelatedPendingAndTodo.numPendingTests = 1;
    withUnrelatedPendingAndTodo.numTodoTests = 1;
    withUnrelatedPendingAndTodo.testResults.push(
      {
        name: resolve(root, 'unregistered-pending.test.mjs'),
        status: 'pending',
        assertionResults: [{ fullName: 'unregistered pending case', status: 'pending' }],
      },
      {
        name: resolve(root, 'unregistered-todo.test.mjs'),
        status: 'todo',
        assertionResults: [{ fullName: 'unregistered todo case', status: 'todo' }],
      },
    );
    expect(() => verifyReport(registry, withUnrelatedPendingAndTodo, root)).not.toThrow();
  });
  it('rejects invalid ownership and paths', () => {
    for (const change of [
      (r) => {
        r.units = [];
      },
      (r) => {
        r.units.push(r.units[0]);
      },
      (r) => {
        r.units[0].owner = '';
      },
      (r) => {
        r.units[0].sources = ['../outside.ts'];
      },
      (r) => {
        r.units[0].sources = ['missing.ts'];
      },
      (r) => {
        r.units[0].tests[0].cases = [];
      },
      (r) => {
        r.units[0].tests[0].cases.push('required behavior');
      },
    ]) {
      const invalid = structuredClone(registry);
      change(invalid);
      expect(() => validateRegistry(invalid, root)).toThrow();
    }
  });
  it('rejects absent or renamed required evidence', () => {
    for (const change of [
      (r) => {
        r.testResults = [];
      },
      (r) => {
        r.testResults[0].name = resolve(root, 'different.test.mjs');
      },
      (r) => {
        r.testResults[0].assertionResults = [];
      },
      (r) => {
        r.testResults[0].assertionResults[0].fullName = 'renamed';
      },
      (r) => {
        r.testResults.push(r.testResults[0]);
      },
    ]) {
      const invalid = report();
      change(invalid);
      expect(() => verifyReport(registry, invalid, root)).toThrow();
    }
  });
  it('rejects false green reports', () => {
    for (const status of ['failed', 'pending', 'skipped', 'todo']) {
      const invalid = report();
      invalid.testResults[0].assertionResults[0].status = status;
      expect(() => verifyReport(registry, invalid, root)).toThrow();
    }
    const failedReport = report();
    failedReport.numFailedTests = 1;
    expect(() => verifyReport(registry, failedReport, root)).toThrow();
    expect(() => verifyReport(registry, { ...report(), success: false }, root)).toThrow();
    expect(() => verifyReport(registry, { ...report(), numTotalTests: 0 }, root)).toThrow();
  });
});
