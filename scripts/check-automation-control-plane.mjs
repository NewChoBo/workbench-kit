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
const researchIndex = readJson('research/index.json');
const researchRecordSchema = readJson('research/record.schema.json');

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
if (
  desired.execution?.mode !== 'docs_planning_analysis' ||
  desired.execution?.dedicatedBranch !== registry.research?.dedicatedBranch
) {
  throw new Error('Scheduled research must use the dedicated docs branch');
}
if (desired.execution?.maxMaterialItemsPerRun !== 1) {
  throw new Error('Scheduled runs must select one material item');
}

const forbidden = new Set(desired.authority?.forbiddenActions ?? []);
for (const action of [
  'push',
  'merge',
  'release',
  'publish',
  'production_code_write',
  'workflow_or_ci_cd_write',
]) {
  if (!forbidden.has(action)) {
    throw new Error(`Missing forbidden scheduled action: ${action}`);
  }
}

for (const relativePath of [
  '.newchobo/automation/CONSTITUTION.md',
  '.newchobo/automation/REGISTRATION_PROMPT.md',
  registry.activeTask.rolePath,
  ...registry.activeTask.protocolPaths,
  registry.research.indexPath,
  registry.research.recordSchemaPath,
  registry.research.reportTemplatePath,
]) {
  const path = resolve(root, relativePath);
  if (!existsSync(path)) {
    throw new Error(`Missing declared automation path: ${relativePath}`);
  }
}

if (resultSchema.properties?.status?.enum?.includes('RESEARCH_COMMITTED') !== true) {
  throw new Error('Result schema must represent a validated research commit');
}
if (researchIndex.schemaVersion !== 1 || researchRecordSchema.properties?.verdict === undefined) {
  throw new Error('Research index and record schema must be versioned');
}
const questionKeys = researchIndex.nextQuestions?.map((entry) => entry.key) ?? [];
if (questionKeys.length === 0 || new Set(questionKeys).size !== questionKeys.length) {
  throw new Error('Research queue must contain unique questions');
}
const researchLanes = new Set(registry.research?.lanes ?? []);
for (const question of researchIndex.nextQuestions ?? []) {
  if (!researchLanes.has(question.lane)) {
    throw new Error(`Unknown research lane: ${question.lane}`);
  }
}
for (const requiredPath of ['docs/**', '.newchobo/automation/research/**']) {
  if (!registry.writePolicy?.allow?.includes(requiredPath)) {
    throw new Error(`Missing scheduled write allowlist: ${requiredPath}`);
  }
}

console.log('Automation control plane is structurally valid.');
