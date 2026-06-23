import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profilePath = path.join(repoRoot, 'packages/json-widget/src/jdw-profile.ts');
const schemaRoot = path.join(repoRoot, 'packages/json-widget/schemas');
const rootSchemaPath = path.join(schemaRoot, 'jdw-node.jdw.schema.json');

const violations = [];
const profileSource = fs.readFileSync(profilePath, 'utf8');
const builtinTypes = extractStringArray('WORKBENCH_JDW_BUILTIN_TYPES');
const extensionTypes = extractStringArray('WORKBENCH_KIT_EXTENSION_TYPES');
const knownTypes = [...builtinTypes, ...extensionTypes];

validateSupportTable();
validateSchemaDirectory('builtins', builtinTypes);
validateSchemaDirectory('extensions', extensionTypes);
validateRootSchema();

if (violations.length > 0) {
  console.error('JDW schema check failed.');
  for (const violation of violations) {
    console.error(`${violation.location} [${violation.rule}] ${violation.message}`);
  }
  process.exit(1);
}

console.log(`JDW schema check passed (${knownTypes.length} profile types).`);

function extractStringArray(exportName) {
  const match = profileSource.match(
    new RegExp(`export const ${exportName} = \\[([\\s\\S]*?)\\] as const;`),
  );

  if (!match) {
    violations.push({
      location: relativePath(profilePath),
      message: `Could not find ${exportName}.`,
      rule: 'missing-profile-array',
    });
    return [];
  }

  return [...match[1].matchAll(/'([^']+)'/g)].map((arrayMatch) => arrayMatch[1]);
}

function validateSupportTable() {
  const supportTypes = [...profileSource.matchAll(/type: '([^']+)'/g)].map((match) => match[1]);
  const knownTypeSet = new Set(knownTypes);
  const supportTypeSet = new Set(supportTypes);

  for (const type of knownTypes) {
    if (!supportTypeSet.has(type)) {
      violations.push({
        location: relativePath(profilePath),
        message: `${type} is listed as a known JDW type without support metadata.`,
        rule: 'missing-support-metadata',
      });
    }
  }

  for (const type of supportTypes) {
    if (!knownTypeSet.has(type)) {
      violations.push({
        location: relativePath(profilePath),
        message: `${type} has support metadata but is not listed as a known JDW type.`,
        rule: 'stale-support-metadata',
      });
    }
  }
}

function validateSchemaDirectory(category, expectedTypes) {
  const directory = path.join(schemaRoot, category);
  const expectedTypeSet = new Set(expectedTypes);
  const files = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort();

  for (const type of expectedTypes) {
    const schemaPath = path.join(directory, `${type}.json`);
    if (!fs.existsSync(schemaPath)) {
      violations.push({
        location: relativePath(schemaPath),
        message: `${type} is listed in the JDW profile but has no ${category} schema file.`,
        rule: 'missing-type-schema',
      });
      continue;
    }

    const schema = readJson(schemaPath);
    if (!schema) {
      continue;
    }

    const expectedId = `https://workbench-kit.dev/schemas/${category}/${type}.json`;
    if (schema.$id !== expectedId) {
      violations.push({
        location: `${relativePath(schemaPath)}#$id`,
        message: `Expected ${expectedId}.`,
        rule: 'schema-id-mismatch',
      });
    }

    if (schema.properties?.type?.const !== type) {
      violations.push({
        location: `${relativePath(schemaPath)}#properties.type.const`,
        message: `Expected const "${type}".`,
        rule: 'schema-type-const-mismatch',
      });
    }
  }

  for (const fileName of files) {
    const type = fileName.slice(0, -'.json'.length);
    if (!expectedTypeSet.has(type)) {
      violations.push({
        location: relativePath(path.join(directory, fileName)),
        message: `${type} schema exists but is not listed in the JDW profile.`,
        rule: 'stale-type-schema',
      });
    }
  }
}

function validateRootSchema() {
  const schema = readJson(rootSchemaPath);
  if (!schema) {
    return;
  }

  const definitions = schema.definitions ?? {};
  const jdwNodeRefs = new Set(
    (definitions.JdwNode?.oneOf ?? [])
      .map((entry) => entry.$ref)
      .filter((value) => typeof value === 'string'),
  );
  const customTypeEnum = new Set(definitions.CustomJdwNode?.properties?.type?.not?.enum ?? []);

  for (const type of knownTypes) {
    const definitionName = definitionNameForType(type);
    const expectedRef = `#/definitions/${definitionName}`;

    if (!Object.prototype.hasOwnProperty.call(definitions, definitionName)) {
      violations.push({
        location: `${relativePath(rootSchemaPath)}#definitions`,
        message: `Missing ${definitionName} for known type "${type}".`,
        rule: 'missing-root-definition',
      });
      continue;
    }

    if (!jdwNodeRefs.has(expectedRef)) {
      violations.push({
        location: `${relativePath(rootSchemaPath)}#definitions.JdwNode.oneOf`,
        message: `Missing ${expectedRef}.`,
        rule: 'missing-root-definition-ref',
      });
    }

    if (definitions[definitionName]?.properties?.type?.const !== type) {
      violations.push({
        location: `${relativePath(rootSchemaPath)}#definitions.${definitionName}.properties.type.const`,
        message: `Expected const "${type}".`,
        rule: 'root-definition-type-mismatch',
      });
    }

    if (!customTypeEnum.has(type)) {
      violations.push({
        location: `${relativePath(rootSchemaPath)}#definitions.CustomJdwNode.properties.type.not.enum`,
        message: `CustomJdwNode must reserve known type "${type}".`,
        rule: 'missing-custom-type-reservation',
      });
    }
  }
}

function definitionNameForType(type) {
  return `${type
    .split('_')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join('')}JdwNode`;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    violations.push({
      location: relativePath(filePath),
      message: error instanceof Error ? error.message : String(error),
      rule: 'invalid-json',
    });
    return undefined;
  }
}

function relativePath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}
