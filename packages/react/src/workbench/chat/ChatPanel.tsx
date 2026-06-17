import { SideBarViewFrame } from '../../layout/SideBarViewFrame';
import { ChatComposer, type ChatComposerProps } from './ChatComposer';
import { ChatMessageList, type ChatMessageListProps } from './ChatMessageList';

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
  title?: string;
}

export function ChatPanel({
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
      title={title}
    >
      <ChatMessageList isStreaming={isRunning} {...messageListProps} />
    </SideBarViewFrame>
  );
}
