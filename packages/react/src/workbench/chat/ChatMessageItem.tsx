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
  showTimestamp?: boolean;
  userLabel?: string;
}

function renderMessageTimestamp(message: ChatMessage) {
  const timestamp = resolveChatMessageTimestamp(message);
  if (!timestamp) {
    return undefined;
  }

  return <ChatMessageTime className="message__time" timestamp={timestamp} />;
}

function MessageRow({
  children,
  rowClassName,
  timestamp,
}: {
  children: ReactNode;
  rowClassName?: string;
  timestamp?: ReactNode;
}) {
  return (
    <div className={cx('message__row', rowClassName)}>
      {timestamp ? <div className="message__time-slot">{timestamp}</div> : null}
      <div className="message__main">{children}</div>
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
  const timestamp = showTimestamp ? renderMessageTimestamp(message) : undefined;
  const rowClassName =
    message.source === 'user' ? 'message__row--leading-time' : 'message__row--trailing-time';

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
        <MessageRow rowClassName={rowClassName} timestamp={timestamp}>
          {displayUserLabel ? <div className="message__user-label">{displayUserLabel}</div> : null}
          <ChatMessageCollapsible
            content={message.content}
            isStreaming={isStreaming}
            surfaceClassName="message__bubble"
          >
            {message.content}
          </ChatMessageCollapsible>
        </MessageRow>
      </div>
    );
  }

  if (layout === 'peer') {
    const peerLabel = showSenderLabel ? (message.label ?? assistantLabel) : undefined;

    return (
      <div className={cx('message', 'message--peer', !showSenderLabel && 'message--continued')}>
        <MessageRow rowClassName={rowClassName} timestamp={timestamp}>
          {peerLabel ? <div className="message__peer-label">{peerLabel}</div> : null}
          <ChatMessageCollapsible
            content={message.content}
            isStreaming={isStreaming}
            surfaceClassName="message__bubble message__bubble--peer"
          >
            {message.content}
          </ChatMessageCollapsible>
        </MessageRow>
      </div>
    );
  }

  return (
    <div className="message message--assistant">
      <MessageRow rowClassName={rowClassName} timestamp={timestamp}>
        <div className="message__label message__label--assistant">
          <i className="codicon codicon-sparkle message__label-icon" />
          {message.label ?? assistantLabel}
        </div>
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
      </MessageRow>
    </div>
  );
}
