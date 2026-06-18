import Markdown from 'react-markdown';
import { cx } from '../../utils/cx';
import { workbenchMarkdownRemarkPlugins } from '../markdownRemarkPlugins';
import type { ChatMessage, ChatMessageLayout } from './types';

export interface ChatMessageItemProps {
  assistantLabel?: string;
  isStreaming?: boolean;
  layout?: ChatMessageLayout;
  message: ChatMessage;
  userLabel?: string;
}

export function ChatMessageItem({
  assistantLabel = 'Assistant',
  isStreaming = false,
  layout = 'assistant',
  message,
  userLabel,
}: ChatMessageItemProps) {
  if (message.source === 'user') {
    const displayUserLabel = layout === 'peer' ? (message.label ?? userLabel) : undefined;

    return (
      <div className={cx('message', 'message--user', layout === 'peer' && 'message--user-peer')}>
        {displayUserLabel ? <div className="message__user-label">{displayUserLabel}</div> : null}
        <div className="message__bubble">{message.content}</div>
      </div>
    );
  }

  if (layout === 'peer') {
    const peerLabel = message.label ?? assistantLabel;

    return (
      <div className="message message--peer">
        {peerLabel ? <div className="message__peer-label">{peerLabel}</div> : null}
        <div className="message__bubble message__bubble--peer">{message.content}</div>
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
