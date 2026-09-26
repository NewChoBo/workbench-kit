import { statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateRegistry(registry, root) {
  requireCondition(
    registry?.version === 1 && Array.isArray(registry.units) && registry.units.length > 0,
    'Expected nonempty version 1 units',
  );
  const ids = new Set();
  for (const unit of registry.units) {
    requireCondition(
      typeof unit.id === 'string' && unit.id.length > 0 && !ids.has(unit.id),
      'Invalid or duplicate unit ID',
    );
    ids.add(unit.id);
    requireCondition(
      typeof unit.owner === 'string' && unit.owner.length > 0,
      `${unit.id}: missing owner`,
    );
    for (const field of ['sources', 'tests']) {
      requireCondition(
        Array.isArray(unit[field]) && unit[field].length > 0,
        `${unit.id}: empty ${field}`,
      );
      for (const entry of unit[field]) {
        const path = field === 'tests' ? entry.file : entry;
        requireCondition(
          typeof path === 'string' &&
            /^[a-zA-Z0-9_./-]+$/.test(path) &&
            !isAbsolute(path) &&
            !path.split('/').includes('..'),
          `${unit.id}: invalid path`,
        );
        requireCondition(
          statSync(resolve(root, path)).isFile(),
          `${unit.id}: missing file ${path}`,
        );
        if (field === 'tests') {
          requireCondition(/\.test\.(ts|tsx|mjs)$/.test(path), `${unit.id}: expected test file`);
          requireCondition(
            Array.isArray(entry.cases) &&
              entry.cases.length > 0 &&
              entry.cases.every((name) => typeof name === 'string' && name.length > 0) &&
              new Set(entry.cases).size === entry.cases.length,
            `${unit.id}: invalid required cases`,
          );
        }
      }
    }
  }
  return registry;
}

export function verifyReport(registry, report, root) {
  requireCondition(
    report?.success === true && Array.isArray(report.testResults),
    'Test runner did not succeed',
  );
  requireCondition(
    report.numTotalTests > 0 &&
      report.numFailedTests === 0 &&
      report.numPendingTests === 0 &&
      (report.numTodoTests ?? 0) === 0,
    'Zero, failed or skipped tests',
  );
  for (const unit of registry.units) {
    for (const required of unit.tests) {
      const matches = report.testResults.filter(
        (result) => relative(root, resolve(result.name)).replaceAll('\\', '/') === required.file,
      );
      requireCondition(
        matches.length === 1,
        `${unit.id}: missing or duplicate report for ${required.file}`,
      );
      const result = matches[0];
      requireCondition(
        result.status === 'passed' && result.assertionResults?.length > 0,
        `${unit.id}: file did not pass`,
      );
      requireCondition(
        result.assertionResults.every((test) => test.status === 'passed'),
        `${unit.id}: failed, skipped or todo case`,
      );
      for (const name of required.cases) {
        requireCondition(
          result.assertionResults.filter(
            (test) => test.fullName === name && test.status === 'passed',
          ).length === 1,
          `${unit.id}: required case did not run: ${name}`,
        );
      }
    }
  }
}
