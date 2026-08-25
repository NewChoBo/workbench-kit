/** Consumer-style smoke against the emitted provider-free public declaration. */
import type { ReactElement } from 'react';

import {
  WorkbenchCommandHostController,
  type WorkbenchCommandHostControllerProps,
} from './.tmp-types/workbench/command-host-controller';

const executeCommand = () => undefined;

export function ExactOptionalCommandHostControllerSmoke(): ReactElement {
  return <WorkbenchCommandHostController commands={[]} executeCommand={executeCommand} />;
}

// @ts-expect-error exact optional props reject an explicit undefined value.
const invalidProps: WorkbenchCommandHostControllerProps = {
  commands: [],
  enableQuickOpen: undefined,
  executeCommand,
};

void invalidProps;
