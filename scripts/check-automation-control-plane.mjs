import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const controlRoot = resolve(root, '.newchobo', 'automation');

function readJson(relativePath) {
  const path = resolve(controlRoot, relativePath);
  if (!existsSync(path)) {
    throw new Error(`Missing automation control file: ${relativePath}`);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

const registry = readJson('registry.json');
const desired = readJson('scheduled-task.json');
const resultSchema = readJson('result.schema.json');

if (registry.schemaVersion !== 1 || desired.schemaVersion !== 1) {
  throw new Error('Automation control schemaVersion must be 1');
}
if (registry.repository?.kind !== 'public-library') {
  throw new Error('Workbench Kit automation must remain public-library scoped');
}
if (registry.activeTask?.taskKey !== desired.taskKey) {
  throw new Error('Registry and desired task keys differ');
}
if (desired.schedule?.frequency !== 'hourly' || !Number.isInteger(desired.schedule?.minuteOffset)) {
  throw new Error('Desired task must declare an hourly minute offset');
}
if (
  desired.execution?.channel !== 'chat' ||
  desired.execution?.target !== 'existing_control_thread'
) {
  throw new Error('Scheduled stewardship must return to the registered Chat');
}
if (desired.execution?.writeIsolation !== 'worktree') {
  throw new Error('Scheduled writes must use an isolated worktree');
}
if (desired.execution?.maxMaterialItemsPerRun !== 1) {
  throw new Error('Scheduled runs must select one material item');
}

const forbidden = new Set(desired.authority?.forbiddenActions ?? []);
for (const action of ['push', 'merge', 'release', 'publish']) {
  if (!forbidden.has(action)) {
    throw new Error(`Missing forbidden scheduled action: ${action}`);
  }
}

for (const relativePath of [
  '.newchobo/automation/CONSTITUTION.md',
  '.newchobo/automation/REGISTRATION_PROMPT.md',
  registry.activeTask.rolePath,
  ...registry.activeTask.protocolPaths,
]) {
  const path = resolve(root, relativePath);
  if (!existsSync(path)) {
    throw new Error(`Missing declared automation path: ${relativePath}`);
  }
}

if (resultSchema.properties?.status?.enum?.includes('CANDIDATE_COMMITTED') !== true) {
  throw new Error('Result schema must represent a validated local candidate');
}

console.log('Automation control plane is structurally valid.');
