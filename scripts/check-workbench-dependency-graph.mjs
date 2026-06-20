import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const packageRules = toRuleMap({
  '@workbench-kit/base': [],
  '@workbench-kit/platform': ['@workbench-kit/base'],
  '@workbench-kit/tokens': [],
  '@workbench-kit/workbench-extension-sdk': ['@workbench-kit/base', '@workbench-kit/platform'],
  '@workbench-kit/workbench-config': ['@workbench-kit/base', '@workbench-kit/platform'],
  '@workbench-kit/workbench-core': [
    '@workbench-kit/base',
    '@workbench-kit/platform',
    '@workbench-kit/workbench-config',
    '@workbench-kit/workbench-extension-sdk',
  ],
  '@workbench-kit/shell-react': [
    '@workbench-kit/platform',
    '@workbench-kit/react',
    '@workbench-kit/tokens',
    '@workbench-kit/workbench-config',
    '@workbench-kit/workbench-core',
    '@workbench-kit/workspace',
  ],
  '@workbench-kit/monaco': ['@workbench-kit/base', '@workbench-kit/platform'],
  '@workbench-kit/contracts': [],
  '@workbench-kit/runtime': ['@workbench-kit/contracts'],
  '@workbench-kit/workspace': [],
  '@workbench-kit/services': ['@workbench-kit/contracts'],
  '@workbench-kit/adapters': [
    '@workbench-kit/contracts',
    '@workbench-kit/runtime',
    '@workbench-kit/workspace',
  ],
  '@workbench-kit/jdw': ['@workbench-kit/contracts'],
  '@workbench-kit/jdw-editor': ['@workbench-kit/jdw', '@workbench-kit/react'],
  '@workbench-kit/react': [
    '@workbench-kit/adapters',
    '@workbench-kit/contracts',
    '@workbench-kit/jdw',
    '@workbench-kit/platform',
    '@workbench-kit/runtime',
    '@workbench-kit/services',
    '@workbench-kit/tokens',
    '@workbench-kit/workspace',
  ],
});

const extensionAllowedDependencies = new Set([
  '@workbench-kit/base',
  '@workbench-kit/platform',
  '@workbench-kit/react',
  '@workbench-kit/workbench-extension-sdk',
  '@workbench-kit/workspace',
]);

const violations = [];
const workspacePackages = readPackageWorkspaces();
const workspacePackageByName = new Map(
  workspacePackages.map((workspacePackage) => [workspacePackage.name, workspacePackage]),
);

for (const workspacePackage of workspacePackages) {
  const allowedDependencies = packageRules.get(workspacePackage.name) ?? new Set();

  checkPackageDependencies(workspacePackage, allowedDependencies, workspacePackageByName);
  scanSourceImports(workspacePackage, allowedDependencies);
}

for (const extensionPackage of readExtensionWorkspaces()) {
  checkPackageDependencies(extensionPackage, extensionAllowedDependencies, workspacePackageByName);
  scanSourceImports(extensionPackage, extensionAllowedDependencies);
}

checkRuntimeDependencyCycles(workspacePackages, workspacePackageByName);

if (violations.length > 0) {
  console.error('Workbench dependency graph check failed.');
  for (const violation of violations) {
    console.error(`${violation.location} [${violation.rule}] ${violation.message}`);
  }
  process.exit(1);
}

console.log('Workbench dependency graph check passed.');

function readPackageWorkspaces() {
  return readdirSync(path.join(repoRoot, 'packages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readWorkspacePackage(path.join(repoRoot, 'packages', entry.name)))
    .filter(Boolean);
}

function readExtensionWorkspaces() {
  return readdirSync(path.join(repoRoot, 'extensions'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readWorkspacePackage(path.join(repoRoot, 'extensions', entry.name)))
    .filter(Boolean);
}

function readWorkspacePackage(directory) {
  const packageJsonPath = path.join(directory, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return undefined;
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  return {
    directory,
    name: packageJson.name,
    packageJson,
    sourceDirectory: path.join(directory, 'src'),
  };
}

function checkPackageDependencies(workspacePackage, allowedDependencies, workspacePackageByName) {
  const dependencies = packageRuntimeDependencies(workspacePackage.packageJson);

  for (const dependency of dependencies) {
    if (dependency === workspacePackage.name) {
      continue;
    }

    validateDependency({
      allowedDependencies,
      dependency,
      location: relativePath(path.join(workspacePackage.directory, 'package.json')),
      sourceName: workspacePackage.name,
    });

    const dependencyPackage = workspacePackageByName.get(dependency);
    if (
      workspacePackage.packageJson.private !== true &&
      dependencyPackage?.packageJson.private === true
    ) {
      violations.push({
        location: relativePath(path.join(workspacePackage.directory, 'package.json')),
        message: `${workspacePackage.name} is public but depends on private package ${dependency}. Move the edge to devDependencies or keep both packages private.`,
        rule: 'private-workbench-dependency',
      });
    }
  }
}

function checkRuntimeDependencyCycles(workspacePackages, workspacePackageByName) {
  const workspaceNames = new Set(
    workspacePackages.map((workspacePackage) => workspacePackage.name),
  );
  const edges = new Map(
    workspacePackages.map((workspacePackage) => [
      workspacePackage.name,
      packageRuntimeDependencies(workspacePackage.packageJson).filter((dependency) =>
        workspaceNames.has(dependency),
      ),
    ]),
  );
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  for (const workspacePackage of workspacePackages) {
    visit(workspacePackage.name);
  }

  function visit(packageName) {
    if (visiting.has(packageName)) {
      const cycleStart = stack.indexOf(packageName);
      const cycle = [...stack.slice(cycleStart), packageName];
      const workspacePackage = workspacePackageByName.get(packageName);
      violations.push({
        location: workspacePackage
          ? relativePath(path.join(workspacePackage.directory, 'package.json'))
          : packageName,
        message: `Runtime workspace dependency cycle detected: ${cycle.join(' -> ')}.`,
        rule: 'cyclic-workbench-dependency',
      });
      return;
    }

    if (visited.has(packageName)) {
      return;
    }

    visiting.add(packageName);
    stack.push(packageName);

    for (const dependency of edges.get(packageName) ?? []) {
      visit(dependency);
    }

    stack.pop();
    visiting.delete(packageName);
    visited.add(packageName);
  }
}

function packageRuntimeDependencies(packageJson) {
  return [
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {}),
  ].filter((dependency) => dependency.startsWith('@workbench-kit/'));
}

function scanSourceImports(workspacePackage, allowedDependencies) {
  if (!existsSync(workspacePackage.sourceDirectory)) {
    return;
  }

  for (const filePath of sourceFiles(workspacePackage.sourceDirectory)) {
    const content = readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    for (const importReference of importReferences(sourceFile)) {
      validateDependency({
        allowedDependencies,
        dependency: importReference.dependency,
        location: `${relativePath(filePath)}:${importReference.line}`,
        sourceName: workspacePackage.name,
      });
    }
  }
}

function validateDependency({ allowedDependencies, dependency, location, sourceName }) {
  if (dependency === sourceName) {
    return;
  }

  if (dependency === '@workbench-kit/core' && sourceName !== '@workbench-kit/core') {
    violations.push({
      location,
      message: `${sourceName} must import @workbench-kit/platform instead of @workbench-kit/core.`,
      rule: 'legacy-core-dependency',
    });
    return;
  }

  if (!allowedDependencies.has(dependency)) {
    violations.push({
      location,
      message: `${sourceName} may not depend on ${dependency}.`,
      rule: 'forbidden-workbench-edge',
    });
  }
}

function* sourceFiles(directory) {
  for (const entry of readdirSync(directory)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === 'build' || entry === 'out') {
      continue;
    }

    const entryPath = path.join(directory, entry);
    const stat = statSync(entryPath);
    if (stat.isDirectory()) {
      yield* sourceFiles(entryPath);
      continue;
    }

    if (/\.(m?[jt]sx?)$/i.test(entry)) {
      yield entryPath;
    }
  }
}

function relativePath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}

function toRuleMap(rules) {
  return new Map(
    Object.entries(rules).map(([packageName, allowedDependencies]) => [
      packageName,
      new Set(allowedDependencies),
    ]),
  );
}

function importReferences(sourceFile) {
  const references = [];

  visit(sourceFile);

  return references;

  function visit(node) {
    const moduleSpecifier = getModuleSpecifier(node);
    const dependency = moduleSpecifier && toWorkspacePackageName(moduleSpecifier);
    if (dependency) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      references.push({
        dependency,
        line: line + 1,
      });
    }

    ts.forEachChild(node, visit);
  }
}

function getModuleSpecifier(node) {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier &&
    ts.isStringLiteral(node.moduleSpecifier)
  ) {
    return node.moduleSpecifier.text;
  }

  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments.length === 1 &&
    ts.isStringLiteral(node.arguments[0])
  ) {
    return node.arguments[0].text;
  }

  return undefined;
}

function toWorkspacePackageName(moduleSpecifier) {
  const match = /^@workbench-kit\/[^/]+/.exec(moduleSpecifier);

  return match?.[0];
}
