import Markdown from 'react-markdown';
import { cx } from '../../utils/cx';
import { workbenchMarkdownRemarkPlugins } from '../markdownRemarkPlugins';
import { ChatCommandProposalCard } from './ChatCommandProposalCard';
import { ChatMessageCollapsible } from './ChatMessageCollapsible';
import { ChatMessageTime } from './chatMessageTime';
import type { ChatCommandProposal, ChatMessage, ChatMessageLayout } from './types';

export interface ChatMessageItemProps {
  assistantLabel?: string;
  isStreaming?: boolean;
  layout?: ChatMessageLayout;
  message: ChatMessage;
  onCommandProposalAllow?: ((messageId: string, proposal: ChatCommandProposal) => void) | undefined;
  onCommandProposalDeny?: ((messageId: string, proposal: ChatCommandProposal) => void) | undefined;
  showSenderLabel?: boolean;
  userLabel?: string;
}

function renderMessageTimestamp(createdAt?: string) {
  if (!createdAt) {
    return undefined;
  }

  return <ChatMessageTime className="message__time" createdAt={createdAt} />;
}

export function ChatMessageItem({
  assistantLabel = 'Assistant',
  isStreaming = false,
  layout = 'assistant',
  message,
  onCommandProposalAllow,
  onCommandProposalDeny,
  showSenderLabel = true,
  userLabel,
}: ChatMessageItemProps) {
  const timestamp = renderMessageTimestamp(message.createdAt);

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
        {displayUserLabel ? <div className="message__user-label">{displayUserLabel}</div> : null}
        <ChatMessageCollapsible
          content={message.content}
          footer={timestamp}
          isStreaming={isStreaming}
          surfaceClassName="message__bubble"
        >
          {message.content}
        </ChatMessageCollapsible>
      </div>
    );
  }

  if (layout === 'peer') {
    const peerLabel = showSenderLabel ? (message.label ?? assistantLabel) : undefined;

    return (
      <div className={cx('message', 'message--peer', !showSenderLabel && 'message--continued')}>
        {peerLabel ? <div className="message__peer-label">{peerLabel}</div> : null}
        <ChatMessageCollapsible
          content={message.content}
          footer={timestamp}
          isStreaming={isStreaming}
          surfaceClassName="message__bubble message__bubble--peer"
        >
          {message.content}
        </ChatMessageCollapsible>
      </div>
    );
  }

  return (
    <div className="message message--assistant">
      <div className="message__label message__label--assistant">
        <i className="codicon codicon-sparkle message__label-icon" />
        {message.label ?? assistantLabel}
      </div>
      <ChatMessageCollapsible
        className="message__assistant-collapsible"
        content={message.content}
        footer={timestamp}
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
    </div>
  );
}
