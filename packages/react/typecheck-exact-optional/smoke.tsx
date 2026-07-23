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
