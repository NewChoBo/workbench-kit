import Markdown from 'react-markdown';
import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { workbenchMarkdownRemarkPlugins } from '../markdownRemarkPlugins';
import { ChatCommandProposalCard } from './ChatCommandProposalCard';
import { ChatMessageCollapsible } from './ChatMessageCollapsible';
import { ChatMessageTime, resolveChatMessageTimestamp } from './chatMessageMeta';
import type {
  ChatCommandProposal,
  ChatMessage,
  ChatMessageContentMode,
  ChatMessageLayout,
  ChatMessageTone,
} from './types';

export interface ChatMessageItemProps {
  /**
   * Rendered after the bubble (and before command proposals). Use for
   * attachments or host chrome that should stay outside the collapsible surface.
   */
  afterMessage?: ReactNode | undefined;
  assistantLabel?: string;
  /** Overrides `message.contentMode` when set. */
  contentMode?: ChatMessageContentMode | undefined;
  /**
   * Forwarded into `ChatMessageCollapsible` in-bubble footer (progress, actions).
   */
  footer?: ReactNode | undefined;
  isStreaming?: boolean;
  /**
   * Assistant-layout label icon. Defaults to sparkle; error/warning tones use
   * status icons. Pass a custom node to override, or `false` to hide.
   */
  labelIcon?: ReactNode | false | undefined;
  layout?: ChatMessageLayout;
  message: ChatMessage;
  onCommandProposalAllow?: ((messageId: string, proposal: ChatCommandProposal) => void) | undefined;
  onCommandProposalDeny?: ((messageId: string, proposal: ChatCommandProposal) => void) | undefined;
  showSenderLabel?: boolean;
  /** When true, keeps the inline timestamp visible without hover. */
  showTimestamp?: boolean;
  /** Overrides `message.tone` when set. */
  tone?: ChatMessageTone | undefined;
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

function ChatMessageCommandProposals({
  message,
  onCommandProposalAllow,
  onCommandProposalDeny,
}: {
  message: ChatMessage;
  onCommandProposalAllow?: ChatMessageItemProps['onCommandProposalAllow'];
  onCommandProposalDeny?: ChatMessageItemProps['onCommandProposalDeny'];
}) {
  if (!message.commandProposals?.length) {
    return null;
  }

  return (
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
  );
}

function ChatMessageAfterSlot({ children }: { children: ReactNode | undefined }) {
  if (!children) {
    return null;
  }

  return <div className="message__after">{children}</div>;
}

function resolveChatMessageContentMode(
  message: ChatMessage,
  layout: ChatMessageLayout,
  contentModeOverride?: ChatMessageContentMode,
): ChatMessageContentMode {
  const explicit = contentModeOverride ?? message.contentMode;
  if (explicit) {
    return explicit;
  }

  // Default: assistant layout + non-user source → markdown; otherwise plain.
  if (layout === 'assistant' && message.source !== 'user') {
    return 'markdown';
  }

  return 'plain';
}

function resolveChatMessageToneClass(
  tone: ChatMessageTone | undefined,
): string | false | undefined {
  if (tone === 'error') {
    return 'message--tone-error';
  }
  if (tone === 'warning') {
    return 'message--tone-warning';
  }
  return undefined;
}

function resolveAssistantLabelIcon(
  labelIcon: ReactNode | false | undefined,
  tone: ChatMessageTone | undefined,
): ReactNode | null {
  if (labelIcon === false) {
    return null;
  }
  if (labelIcon !== undefined) {
    return labelIcon;
  }
  if (tone === 'error') {
    return <i className="codicon codicon-error message__label-icon" />;
  }
  if (tone === 'warning') {
    return <i className="codicon codicon-warning message__label-icon" />;
  }
  return <i className="codicon codicon-sparkle message__label-icon" />;
}

function ChatMessageBody({
  content,
  contentMode,
  isStreaming,
}: {
  content: string;
  contentMode: ChatMessageContentMode;
  isStreaming: boolean;
}) {
  if (contentMode === 'markdown') {
    return (
      <div className="md-content">
        <Markdown
          remarkPlugins={workbenchMarkdownRemarkPlugins}
          components={{
            code: ({ children, className }) => (
              <code className={cx('ui-workbench-scrollbar', className)}>{children}</code>
            ),
          }}
        >
          {content}
        </Markdown>
        {isStreaming ? <span aria-hidden="true" className="message__cursor" /> : null}
      </div>
    );
  }

  return (
    <>
      {content}
      {isStreaming ? <span aria-hidden="true" className="message__cursor" /> : null}
    </>
  );
}

export function ChatMessageItem({
  afterMessage,
  assistantLabel = 'Assistant',
  contentMode: contentModeProp,
  footer,
  isStreaming = false,
  labelIcon,
  layout = 'assistant',
  message,
  onCommandProposalAllow,
  onCommandProposalDeny,
  showSenderLabel = true,
  showTimestamp = false,
  tone: toneProp,
  userLabel,
}: ChatMessageItemProps) {
  const timestamp = renderMessageTimestamp(message, showTimestamp);
  const bubbleAlign = message.source === 'user' ? 'end' : 'start';
  const contentMode = resolveChatMessageContentMode(message, layout, contentModeProp);
  const resolvedTone = toneProp ?? message.tone;
  const toneClass = resolveChatMessageToneClass(resolvedTone);
  const assistantLabelIcon = resolveAssistantLabelIcon(labelIcon, resolvedTone);
  const body = (
    <ChatMessageBody
      content={message.content}
      contentMode={contentMode}
      isStreaming={isStreaming}
    />
  );

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
          toneClass,
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
                footer={footer}
                isStreaming={isStreaming}
                surfaceClassName="message__bubble"
              >
                {body}
              </ChatMessageCollapsible>
            </MessageBubbleLine>
            <ChatMessageAfterSlot>{afterMessage}</ChatMessageAfterSlot>
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'peer') {
    const peerLabel = showSenderLabel ? (message.label ?? assistantLabel) : undefined;

    return (
      <div
        className={cx(
          'message',
          'message--peer',
          !showSenderLabel && 'message--continued',
          toneClass,
        )}
      >
        <div className="message__row">
          <div className="message__main">
            {peerLabel ? <div className="message__peer-label">{peerLabel}</div> : null}
            <MessageBubbleLine align={bubbleAlign} timestamp={timestamp}>
              <ChatMessageCollapsible
                content={message.content}
                footer={footer}
                isStreaming={isStreaming}
                surfaceClassName="message__bubble message__bubble--peer"
              >
                {body}
              </ChatMessageCollapsible>
            </MessageBubbleLine>
            <ChatMessageAfterSlot>{afterMessage}</ChatMessageAfterSlot>
            <ChatMessageCommandProposals
              message={message}
              onCommandProposalAllow={onCommandProposalAllow}
              onCommandProposalDeny={onCommandProposalDeny}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cx('message', 'message--assistant', toneClass)}>
      <div className="message__row">
        <div className="message__main">
          <div className="message__label message__label--assistant">
            {assistantLabelIcon}
            {message.label ?? assistantLabel}
          </div>
          <MessageBubbleLine align={bubbleAlign} timestamp={timestamp}>
            <ChatMessageCollapsible
              className="message__assistant-collapsible"
              content={message.content}
              footer={footer}
              isStreaming={isStreaming}
              surfaceClassName="message__collapsible-surface--assistant"
            >
              {body}
            </ChatMessageCollapsible>
          </MessageBubbleLine>
          <ChatMessageAfterSlot>{afterMessage}</ChatMessageAfterSlot>
          <ChatMessageCommandProposals
            message={message}
            onCommandProposalAllow={onCommandProposalAllow}
            onCommandProposalDeny={onCommandProposalDeny}
          />
        </div>
      </div>
    </div>
  );
}
