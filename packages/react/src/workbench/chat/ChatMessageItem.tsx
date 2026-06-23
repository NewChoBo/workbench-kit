import Markdown from 'react-markdown';
import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { workbenchMarkdownRemarkPlugins } from '../markdownRemarkPlugins';
import { ChatCommandProposalCard } from './ChatCommandProposalCard';
import { ChatMessageCollapsible } from './ChatMessageCollapsible';
import { ChatMessageTime, resolveChatMessageTimestamp } from './chatMessageTime';
import type { ChatCommandProposal, ChatMessage, ChatMessageLayout } from './types';

export interface ChatMessageItemProps {
  assistantLabel?: string;
  isStreaming?: boolean;
  layout?: ChatMessageLayout;
  message: ChatMessage;
  onCommandProposalAllow?: ((messageId: string, proposal: ChatCommandProposal) => void) | undefined;
  onCommandProposalDeny?: ((messageId: string, proposal: ChatCommandProposal) => void) | undefined;
  showSenderLabel?: boolean;
  /** When true, keeps the inline timestamp visible without hover. */
  showTimestamp?: boolean;
  userLabel?: string;
}

function renderMessageTimestamp(message: ChatMessage, pinned: boolean) {
  const timestamp = resolveChatMessageTimestamp(message);
  if (!timestamp) {
    return undefined;
  }

  return (
    <ChatMessageTime
      className={cx('message__time', pinned && 'message__time--pinned')}
      timestamp={timestamp}
    />
  );
}

function MessageBubbleLine({
  align,
  children,
  timestamp,
}: {
  align: 'start' | 'end';
  children: ReactNode;
  timestamp?: ReactNode;
}) {
  return (
    <div
      className={cx(
        'message__bubble-line',
        align === 'end' ? 'message__bubble-line--end' : 'message__bubble-line--start',
      )}
    >
      {align === 'end' && timestamp ? <div className="message__time-slot">{timestamp}</div> : null}
      {children}
      {align === 'start' && timestamp ? (
        <div className="message__time-slot">{timestamp}</div>
      ) : null}
    </div>
  );
}

export function ChatMessageItem({
  assistantLabel = 'Assistant',
  isStreaming = false,
  layout = 'assistant',
  message,
  onCommandProposalAllow,
  onCommandProposalDeny,
  showSenderLabel = true,
  showTimestamp = false,
  userLabel,
}: ChatMessageItemProps) {
  const timestamp = renderMessageTimestamp(message, showTimestamp);
  const bubbleAlign = message.source === 'user' ? 'end' : 'start';

  if (message.source === 'user') {
    const displayUserLabel =
      layout === 'peer' && showSenderLabel ? (message.label ?? userLabel) : undefined;

    return (
      <div
        className={cx(
          'message',
          'message--user',
          layout === 'peer' && 'message--user-peer',
          layout === 'peer' && !showSenderLabel && 'message--continued',
        )}
      >
        <div className="message__row">
          <div className="message__main">
            {displayUserLabel ? (
              <div className="message__user-label">{displayUserLabel}</div>
            ) : null}
            <MessageBubbleLine align={bubbleAlign} timestamp={timestamp}>
              <ChatMessageCollapsible
                content={message.content}
                isStreaming={isStreaming}
                surfaceClassName="message__bubble"
              >
                {message.content}
              </ChatMessageCollapsible>
            </MessageBubbleLine>
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'peer') {
    const peerLabel = showSenderLabel ? (message.label ?? assistantLabel) : undefined;

    return (
      <div className={cx('message', 'message--peer', !showSenderLabel && 'message--continued')}>
        <div className="message__row">
          <div className="message__main">
            {peerLabel ? <div className="message__peer-label">{peerLabel}</div> : null}
            <MessageBubbleLine align={bubbleAlign} timestamp={timestamp}>
              <ChatMessageCollapsible
                content={message.content}
                isStreaming={isStreaming}
                surfaceClassName="message__bubble message__bubble--peer"
              >
                {message.content}
              </ChatMessageCollapsible>
            </MessageBubbleLine>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message message--assistant">
      <div className="message__row">
        <div className="message__main">
          <div className="message__label message__label--assistant">
            <i className="codicon codicon-sparkle message__label-icon" />
            {message.label ?? assistantLabel}
          </div>
          <MessageBubbleLine align={bubbleAlign} timestamp={timestamp}>
            <ChatMessageCollapsible
              className="message__assistant-collapsible"
              content={message.content}
              isStreaming={isStreaming}
              surfaceClassName="message__collapsible-surface--assistant"
            >
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
            </ChatMessageCollapsible>
          </MessageBubbleLine>
          {message.commandProposals?.length ? (
            <div className="message__command-proposals">
              {message.commandProposals.map((proposal) => (
                <ChatCommandProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onAllow={
                    onCommandProposalAllow
                      ? (currentProposal) => onCommandProposalAllow(message.id, currentProposal)
                      : undefined
                  }
                  onDeny={
                    onCommandProposalDeny
                      ? (currentProposal) => onCommandProposalDeny(message.id, currentProposal)
                      : undefined
                  }
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
