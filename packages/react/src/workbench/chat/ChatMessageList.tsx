import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { SideBarScrollSpacer } from '../../layout/SideBarViewFrame';
import { cx } from '../../utils/cx';
import { ChatMessageItem, type ChatMessageItemProps } from './ChatMessageItem';
import {
  ChatMessageDateDivider,
  resolveChatMessageTimestamp,
  shouldShowChatMessageDateDivider,
  shouldShowChatMessageTimestamp,
  shouldShowPeerChatSenderLabel,
} from './chatMessageMeta';
import type { ChatMessage, ChatMessageLayout } from './types';

const DEFAULT_LOAD_OLDER_ROOT_MARGIN = '160px 0px 0px 0px';

export interface ChatMessageListProps {
  assistantLabel?: string;
  emptyLabel?: string;
  initialVisibleMessageCount?: number;
  isStreaming?: boolean;
  loadOlderLabel?: ReactNode | ((hiddenMessageCount: number) => ReactNode);
  messageLayout?: ChatMessageLayout;
  messages: ChatMessage[];
  onCommandProposalAllow?: ChatMessageItemProps['onCommandProposalAllow'];
  onCommandProposalDeny?: ChatMessageItemProps['onCommandProposalDeny'];
  paginationKey?: string;
  userLabel?: string;
  visibleMessagePageSize?: number;
}

export function ChatMessageList({
  assistantLabel,
  emptyLabel = 'How can I help?',
  initialVisibleMessageCount,
  isStreaming = false,
  loadOlderLabel = 'Show older messages',
  messageLayout = 'assistant',
  messages,
  onCommandProposalAllow,
  onCommandProposalDeny,
  paginationKey = '',
  userLabel,
  visibleMessagePageSize,
}: ChatMessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingPrependScrollRef = useRef<{
    scrollHeight: number;
    scrollTop: number;
  } | null>(null);
  const emptyIconClass =
    messageLayout === 'peer' ? 'codicon-comment-discussion' : 'codicon-sparkle';
  const resolvedUserLabel = userLabel ?? (messageLayout === 'peer' ? 'Jay' : undefined);
  const normalizedInitialVisibleMessageCount =
    initialVisibleMessageCount !== undefined
      ? Math.max(1, Math.floor(initialVisibleMessageCount))
      : messages.length;
  const normalizedVisibleMessagePageSize = Math.max(
    1,
    Math.floor(visibleMessagePageSize ?? normalizedInitialVisibleMessageCount),
  );
  const isPaginationEnabled =
    initialVisibleMessageCount !== undefined &&
    messages.length > normalizedInitialVisibleMessageCount;
  const [pagination, setPagination] = useState({
    key: paginationKey,
    visibleMessageLimit: normalizedInitialVisibleMessageCount,
  });
  const visibleMessageLimit = isPaginationEnabled
    ? pagination.key === paginationKey
      ? pagination.visibleMessageLimit
      : normalizedInitialVisibleMessageCount
    : messages.length;
  const displayedStartIndex = Math.max(0, messages.length - visibleMessageLimit);
  const displayedMessages = messages.slice(displayedStartIndex);
  const hiddenMessageCount = displayedStartIndex;
  const hasOlderMessages = hiddenMessageCount > 0;
  const lastMessageId = messages.length > 0 ? (messages[messages.length - 1]?.id ?? '') : '';
  const getScrollContainer = useCallback(
    () => listRef.current?.closest<HTMLElement>('.ui-side-bar-view__body') ?? null,
    [],
  );
  const loadOlderMessages = useCallback(() => {
    if (!hasOlderMessages || pendingPrependScrollRef.current) return;

    const scrollContainer = getScrollContainer();
    if (scrollContainer) {
      pendingPrependScrollRef.current = {
        scrollHeight: scrollContainer.scrollHeight,
        scrollTop: scrollContainer.scrollTop,
      };
    }

    setPagination((currentPagination) => {
      const currentLimit =
        currentPagination.key === paginationKey
          ? currentPagination.visibleMessageLimit
          : normalizedInitialVisibleMessageCount;

      return {
        key: paginationKey,
        visibleMessageLimit: Math.min(
          messages.length,
          currentLimit + normalizedVisibleMessagePageSize,
        ),
      };
    });
  }, [
    getScrollContainer,
    hasOlderMessages,
    messages.length,
    normalizedInitialVisibleMessageCount,
    normalizedVisibleMessagePageSize,
    paginationKey,
  ]);

  useEffect(() => {
    pendingPrependScrollRef.current = null;
  }, [paginationKey]);

  useEffect(() => {
    if (!isPaginationEnabled || !hasOlderMessages) return undefined;

    const scrollContainer = getScrollContainer();
    const sentinel = topSentinelRef.current;
    if (!scrollContainer || !sentinel || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          loadOlderMessages();
        }
      },
      {
        root: scrollContainer,
        rootMargin: DEFAULT_LOAD_OLDER_ROOT_MARGIN,
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [getScrollContainer, hasOlderMessages, isPaginationEnabled, loadOlderMessages]);

  useLayoutEffect(() => {
    const pendingPrependScroll = pendingPrependScrollRef.current;
    if (pendingPrependScroll) {
      const scrollContainer = getScrollContainer();
      if (scrollContainer) {
        scrollContainer.scrollTop =
          scrollContainer.scrollHeight -
          pendingPrependScroll.scrollHeight +
          pendingPrependScroll.scrollTop;
      }

      pendingPrependScrollRef.current = null;
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [displayedMessages.length, getScrollContainer, isStreaming, lastMessageId]);

  if (messages.length === 0) {
    return (
      <div className="message-empty">
        <i className={cx('codicon', emptyIconClass)} />
        <span>{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div ref={listRef} className="message-list">
      {hasOlderMessages ? (
        <div ref={topSentinelRef} className="message-list__history-loader">
          <button type="button" className="message-list__load-older" onClick={loadOlderMessages}>
            {typeof loadOlderLabel === 'function'
              ? loadOlderLabel(hiddenMessageCount)
              : loadOlderLabel}
            <span className="message-list__load-older-count">({hiddenMessageCount})</span>
          </button>
        </div>
      ) : isPaginationEnabled ? (
        <div ref={topSentinelRef} aria-hidden className="message-list__top-sentinel" />
      ) : null}
      {displayedMessages.map((message, displayedIndex) => {
        const index = displayedStartIndex + displayedIndex;
        const messageTimestamp = resolveChatMessageTimestamp(message);

        return (
          <Fragment key={message.id}>
            {shouldShowChatMessageDateDivider(messages, index) && messageTimestamp ? (
              <ChatMessageDateDivider timestamp={messageTimestamp} />
            ) : null}
            <ChatMessageItem
              assistantLabel={assistantLabel}
              isStreaming={
                isStreaming && index === messages.length - 1 && message.source === 'assistant'
              }
              layout={messageLayout}
              message={message}
              onCommandProposalAllow={onCommandProposalAllow}
              onCommandProposalDeny={onCommandProposalDeny}
              showSenderLabel={
                messageLayout !== 'peer' ||
                shouldShowPeerChatSenderLabel(messages, index, {
                  assistantLabel,
                  userLabel: resolvedUserLabel,
                })
              }
              showTimestamp={shouldShowChatMessageTimestamp(messages, index)}
              userLabel={resolvedUserLabel}
            />
          </Fragment>
        );
      })}
      <SideBarScrollSpacer ref={bottomRef} />
    </div>
  );
}
