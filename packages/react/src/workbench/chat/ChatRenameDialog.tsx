import { useId, useState } from 'react';
import { Modal } from '../../modal/Modal';
import { Button } from '../../primitives/Button';
import { TextInput } from '../../primitives/TextInput';
import type {
  WorkbenchChatConversation,
  WorkbenchChatConversationLabels,
} from './chatConversation';
import { defaultWorkbenchChatConversationLabels } from './chatConversation';

export interface ChatRenameDialogProps {
  conversation: WorkbenchChatConversation;
  labels?: Partial<WorkbenchChatConversationLabels> | undefined;
  onCancel: () => void;
  onRename: (title: string) => void;
}

export function ChatRenameDialog({
  conversation,
  labels: labelOverrides,
  onCancel,
  onRename,
}: ChatRenameDialogProps) {
  const labels = { ...defaultWorkbenchChatConversationLabels, ...labelOverrides };
  const inputId = useId();
  const [title, setTitle] = useState(conversation.title);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError(labels.renameEmptyError);
      return;
    }

    onRename(trimmed);
  };

  return (
    <Modal
      bodyClassName="chat-rename-dialog__body"
      className="chat-rename-dialog"
      closeLabel={labels.closeRename}
      title={labels.renameDialogTitle}
      onClose={onCancel}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      footer={
        <>
          <Button type="button" onClick={onCancel}>
            {labels.cancel}
          </Button>
          <Button type="submit" variant="primary">
            {labels.renameSubmit}
          </Button>
        </>
      }
    >
      <label className="chat-rename-dialog__label" htmlFor={inputId}>
        {labels.renameFieldLabel}
      </label>
      <TextInput
        autoFocus
        controlWidth="full"
        id={inputId}
        value={title}
        onChange={(event) => {
          setTitle(event.currentTarget.value);
          if (error) setError(null);
        }}
      />
      {error ? <p className="chat-rename-dialog__error">{error}</p> : null}
    </Modal>
  );
}
