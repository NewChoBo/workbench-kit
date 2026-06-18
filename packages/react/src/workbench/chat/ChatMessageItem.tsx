import Markdown from 'react-markdown';
import { cx } from '../../utils/cx';
import { workbenchMarkdownRemarkPlugins } from '../markdownRemarkPlugins';
import type { ChatMessage } from './types';

export interface ChatMessageItemProps {
  assistantLabel?: string;
  isStreaming?: boolean;
  message: ChatMessage;
}

export function ChatMessageItem({
  assistantLabel = 'Assistant',
  isStreaming = false,
  message,
}: ChatMessageItemProps) {
  if (message.source === 'user') {
    return (
      <div className="message message--user">
        <div className="message__bubble">{message.content}</div>
      </div>
    );
  }

  return (
    <div className="message message--assistant">
      <div className="message__label message__label--assistant">
        <i className="codicon codicon-sparkle message__label-icon" />
        {message.label ?? assistantLabel}
      </div>
      <div className="md-content">
        <Markdown
          remarkPlugins={workbenchMarkdownRemarkPlugins}
          components={{
            code: ({ className, ...props }) => (
              <code className={cx('ui-workbench-scrollbar', className)} {...props} />
            ),
          }}
        >
          {message.content}
        </Markdown>
        {isStreaming ? <span aria-hidden="true" className="message__cursor" /> : null}
      </div>
    </div>
  );
}
