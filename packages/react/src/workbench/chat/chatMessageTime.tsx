const chatMessageTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

export function formatChatMessageTime(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return chatMessageTimeFormatter.format(date);
}

export interface ChatMessageTimeProps {
  createdAt: string;
  className?: string;
}

export function ChatMessageTime({ className, createdAt }: ChatMessageTimeProps) {
  const label = formatChatMessageTime(createdAt);
  if (!label) {
    return null;
  }

  return (
    <time className={className} dateTime={createdAt}>
      {label}
    </time>
  );
}
