import {
  formatChatMessageDateLabel,
  toChatMessageTimeDateTime,
  type ChatMessageTimestampInput,
} from './chatMessageTime';

export interface ChatMessageDateDividerProps {
  timestamp: ChatMessageTimestampInput;
}

export function ChatMessageDateDivider({ timestamp }: ChatMessageDateDividerProps) {
  const label = formatChatMessageDateLabel(timestamp);
  if (!label) {
    return null;
  }

  return (
    <div aria-label={label} className="message-date-divider" role="separator">
      <time className="message-date-divider__label" dateTime={toChatMessageTimeDateTime(timestamp)}>
        {label}
      </time>
    </div>
  );
}
