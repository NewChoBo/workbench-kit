import { SideBarViewFrame } from '../../layout/SideBarViewFrame';
import { ChatComposer, type ChatComposerProps } from './ChatComposer';
import { ChatMessageList, type ChatMessageListProps } from './ChatMessageList';
import type { ReactNode, Ref } from 'react';

export interface ChatPanelProps
  extends
    ChatMessageListProps,
    Pick<
      ChatComposerProps,
      | 'disabled'
      | 'commandLabel'
      | 'commandSuggestPopover'
      | 'isRunning'
      | 'onCancel'
      | 'onCommandClick'
      | 'onKeyDown'
      | 'onSubmit'
      | 'onValueChange'
      | 'placeholder'
      | 'showTools'
      | 'value'
    > {
  composerRef?: Ref<HTMLTextAreaElement> | undefined;
  headerAddon?: ReactNode | undefined;
  title?: string;
}

export function ChatPanel({
  commandLabel,
  commandSuggestPopover,
  composerRef,
  headerAddon,
  title = 'Chat',
  value,
  onValueChange,
  onSubmit,
  onCancel,
  onCommandClick,
  onKeyDown,
  placeholder,
  disabled,
  isRunning,
  showTools,
  ...messageListProps
}: ChatPanelProps) {
  return (
    <SideBarViewFrame
      className="chat-side-bar-view"
      footer={
        <ChatComposer
          ref={composerRef}
          commandLabel={commandLabel}
          commandSuggestPopover={commandSuggestPopover}
          disabled={disabled}
          isRunning={isRunning}
          placeholder={placeholder}
          showTools={showTools}
          value={value}
          onCancel={onCancel}
          onCommandClick={onCommandClick}
          onKeyDown={onKeyDown}
          onSubmit={onSubmit}
          onValueChange={onValueChange}
        />
      }
      footerPlacement="overlay"
      headerAddon={headerAddon}
      title={title}
    >
      <ChatMessageList isStreaming={isRunning} {...messageListProps} />
    </SideBarViewFrame>
  );
}
