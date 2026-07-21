import { parseWorkspaceResourceUri } from '@workbench-kit/workspace';

/** Pure helper — kept out of React component modules for Fast Refresh. */
export function createWorkspaceFileAvailabilityChecker(
  filePaths: ReadonlySet<string>,
): (resourceUri: string) => boolean {
  return (resourceUri) => {
    const parsed = parseWorkspaceResourceUri(resourceUri);
    if (!parsed || parsed.kind !== 'file') {
      return true;
    }

    return filePaths.has(parsed.path);
  };
}
