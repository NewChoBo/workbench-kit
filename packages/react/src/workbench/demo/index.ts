// Private workspace-only Storybook demo barrel. This path is intentionally not
// exported by @workbench-kit/react.
export { IntegratedShellDemo } from './IntegratedShellDemo';
export type { IntegratedShellDemoProps } from './IntegratedShellDemo';
export {
  integratedShellActivities,
  integratedShellActivityOrder,
  integratedShellCommandActivities,
  isIntegratedShellActivityId,
} from './integratedShellActivities';
export type {
  IntegratedShellActivity,
  IntegratedShellActivityId,
} from './integratedShellActivities';
export {
  integratedShellCommandPolicy,
  integratedShellCommandRegistry,
} from './integratedShellCommands';
export { useIntegratedShellWorkspaceOrchestration } from './integratedShellWorkspaceOrchestration';
export type {
  IntegratedShellPendingDelete,
  IntegratedShellWorkspaceOrchestration,
  UseIntegratedShellWorkspaceOrchestrationOptions,
} from './integratedShellWorkspaceOrchestration';
