import { SideBarViewFrame } from '../../layout/SideBarViewFrame';
import { ChatComposer, type ChatComposerProps } from './ChatComposer';
import { ChatMessageList, type ChatMessageListProps } from './ChatMessageList';
import type { ReactNode } from 'react';

export interface ChatPanelProps
  extends
    ChatMessageListProps,
    Pick<
      ChatComposerProps,
      | 'disabled'
      | 'isRunning'
      | 'onCancel'
      | 'onSubmit'
      | 'onValueChange'
      | 'placeholder'
      | 'showTools'
      | 'value'
    > {
  headerAddon?: ReactNode | undefined;
  title?: string;
}

export function ChatPanel({
  headerAddon,
  title = 'Chat',
  value,
  onValueChange,
  onSubmit,
  onCancel,
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
          disabled={disabled}
          isRunning={isRunning}
          placeholder={placeholder}
          showTools={showTools}
          value={value}
          onCancel={onCancel}
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
