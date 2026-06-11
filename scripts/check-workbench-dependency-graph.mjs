import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const packageRules = toRuleMap({
  '@workbench-kit/base': [],
  '@workbench-kit/platform': ['@workbench-kit/base'],
  '@workbench-kit/core': ['@workbench-kit/platform'],
  '@workbench-kit/tokens': [],
  '@workbench-kit/workbench-extension-sdk': ['@workbench-kit/base', '@workbench-kit/platform'],
  '@workbench-kit/workbench-config': ['@workbench-kit/base', '@workbench-kit/platform'],
  '@workbench-kit/workbench-core': [
    '@workbench-kit/base',
    '@workbench-kit/platform',
    '@workbench-kit/workbench-config',
    '@workbench-kit/workbench-extension-sdk',
  ],
  '@workbench-kit/workbench-react': [
    '@workbench-kit/platform',
    '@workbench-kit/react',
    '@workbench-kit/tokens',
    '@workbench-kit/workbench-config',
    '@workbench-kit/workbench-core',
  ],
  '@workbench-kit/workbench-vscode-adapter': [
    '@workbench-kit/base',
    '@workbench-kit/platform',
    '@workbench-kit/workbench-core',
    '@workbench-kit/workbench-extension-sdk',
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
    '@workbench-kit/jdw-editor',
    '@workbench-kit/platform',
    '@workbench-kit/runtime',
    '@workbench-kit/services',
    '@workbench-kit/tokens',
    '@workbench-kit/vscode-extension',
    '@workbench-kit/workspace',
  ],
  '@workbench-kit/vscode-host': [
    '@workbench-kit/contracts',
    '@workbench-kit/platform',
    '@workbench-kit/services',
  ],
  '@workbench-kit/vscode-extension': [
    '@workbench-kit/adapters',
    '@workbench-kit/contracts',
    '@workbench-kit/platform',
    '@workbench-kit/services',
    '@workbench-kit/vscode-host',
  ],
});

const extensionAllowedDependencies = new Set([
  '@workbench-kit/base',
  '@workbench-kit/platform',
  '@workbench-kit/react',
  '@workbench-kit/workbench-extension-sdk',
  '@workbench-kit/workbench-vscode-adapter',
]);

const violations = [];

for (const workspacePackage of readPackageWorkspaces()) {
  const allowedDependencies = packageRules.get(workspacePackage.name) ?? new Set();

  checkPackageDependencies(workspacePackage, allowedDependencies);
  scanSourceImports(workspacePackage, allowedDependencies);
}

for (const extensionPackage of readExtensionWorkspaces()) {
  checkPackageDependencies(extensionPackage, extensionAllowedDependencies);
  scanSourceImports(extensionPackage, extensionAllowedDependencies);
}

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

function checkPackageDependencies(workspacePackage, allowedDependencies) {
  const dependencies = [
    ...Object.keys(workspacePackage.packageJson.dependencies ?? {}),
    ...Object.keys(workspacePackage.packageJson.peerDependencies ?? {}),
    ...Object.keys(workspacePackage.packageJson.optionalDependencies ?? {}),
  ].filter((dependency) => dependency.startsWith('@workbench-kit/'));

  for (const dependency of dependencies) {
    validateDependency({
      allowedDependencies,
      dependency,
      location: relativePath(path.join(workspacePackage.directory, 'package.json')),
      sourceName: workspacePackage.name,
    });
  }
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
