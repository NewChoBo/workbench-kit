/**
 * Consumer-style smoke against emitted public `.d.ts` with
 * `exactOptionalPropertyTypes` enabled.
 *
 * Imports leaf declaration files (not package barrels) so TypeScript does not
 * pull unrelated workspace implementation graphs into this program.
 *
 * Omit optional props or pass concrete values — do not assign explicit `undefined`.
 */
import type { ReactElement } from 'react';
import { Button } from './.tmp-types/primitives/button/Button';
import { IconButton } from './.tmp-types/primitives/icon-button/IconButton';
import { ScrollArea } from './.tmp-types/primitives/scroll-area/ScrollArea';
import { TextInput } from './.tmp-types/primitives/text-input/TextInput';
import { Modal } from './.tmp-types/modal/Modal';
import { WorkbenchShell } from './.tmp-types/workbench/shell/WorkbenchShell';
import { ChatPanel } from './.tmp-types/workbench/chat/ChatPanel';
import { ExtensionManagementPanel } from './.tmp-types/workbench/management/ExtensionManagementPanel';
import { ExtensionManagementSidebar } from './.tmp-types/workbench/management/ExtensionManagementSidebar';
import type { ExtensionManagementEntry } from './.tmp-types/workbench/management/types';
import {
  WorkbenchSchemaForm,
  type WorkbenchSchemaFormProps,
} from './.tmp-types/workbench/settings/SchemaForm';

export function ExactOptionalPrimitivesSmoke(): ReactElement {
  return (
    <>
      <Button>Save</Button>
      <Button block compact icon="check" variant="primary">
        Save
      </Button>
      <IconButton icon="close" label="Close" />
      <TextInput value="query" onChange={() => undefined} />
      <ScrollArea orientation="vertical">content</ScrollArea>
    </>
  );
}

export function ExactOptionalModalSmoke(): ReactElement {
  return (
    <Modal title="Settings" onClose={() => undefined} closeOnEscape restoreFocusOnClose>
      Body
    </Modal>
  );
}

export function ExactOptionalShellSmoke(): ReactElement {
  return (
    <WorkbenchShell
      activityBar={{
        items: [{ id: 'explorer', icon: 'files', label: 'Explorer', active: true }],
      }}
      secondaryArea={<div>Editor</div>}
      statusSections={[]}
      theme="dark"
    />
  );
}

export function ExactOptionalChatSmoke(): ReactElement {
  return (
    <ChatPanel
      title="Chat"
      value=""
      onValueChange={() => undefined}
      onSubmit={() => undefined}
      messages={[]}
    />
  );
}

// @ts-expect-error exactOptionalPropertyTypes rejects explicit undefined for an optional prop.
const invalidSchemaFormProps: WorkbenchSchemaFormProps = {
  fields: [],
  focusFirstInvalidFieldOnSubmit: undefined,
};
void invalidSchemaFormProps;

export function ExactOptionalSchemaFormSmoke(): ReactElement {
  return (
    <>
      <WorkbenchSchemaForm fields={[]} />
      <WorkbenchSchemaForm fields={[]} focusFirstInvalidFieldOnSubmit={false} />
      <WorkbenchSchemaForm fields={[]} focusFirstInvalidFieldOnSubmit />
    </>
  );
}

const legacyExtensionManagementEntry: ExtensionManagementEntry = {
  category: 'utility',
  displayName: 'Legacy Extension',
  enabled: true,
  id: 'workbench-kit.consumer.legacy-extension',
  source: 'installed',
};

function ForwardPendingUninstallEntry({
  pendingUninstallEntryId,
}: {
  pendingUninstallEntryId: string | undefined;
}): ReactElement {
  return (
    <ExtensionManagementSidebar
      browseEntries={[]}
      installedEntries={[legacyExtensionManagementEntry]}
      pendingUninstallEntryId={pendingUninstallEntryId}
    />
  );
}

export function ExactOptionalExtensionManagementSmoke(): ReactElement {
  return (
    <>
      <ExtensionManagementPanel
        browseEntries={[]}
        installedEntries={[legacyExtensionManagementEntry]}
      />
      <ExtensionManagementSidebar
        browseEntries={[]}
        installedEntries={[legacyExtensionManagementEntry]}
        pendingUninstallEntryId={legacyExtensionManagementEntry.id}
      />
      <ForwardPendingUninstallEntry pendingUninstallEntryId={undefined} />
    </>
  );
}
