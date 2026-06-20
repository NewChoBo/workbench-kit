import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Button } from '../../primitives/Button';
import { cx } from '../../utils/cx';

export const CHAT_MESSAGE_COLLAPSE_MAX_LINES = 8;

export interface ChatMessageCollapsibleProps {
  children: ReactNode;
  className?: string;
  content: string;
  footer?: ReactNode;
  isStreaming?: boolean;
  maxLines?: number;
  surfaceClassName?: string;
  toggleClassName?: string;
}

export function ChatMessageCollapsible({
  children,
  className,
  content,
  footer,
  isStreaming = false,
  maxLines = CHAT_MESSAGE_COLLAPSE_MAX_LINES,
  surfaceClassName,
  toggleClassName,
}: ChatMessageCollapsibleProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canCollapse, setCanCollapse] = useState(false);
  const clamped = !expanded && !isStreaming;

  useLayoutEffect(() => {
    if (isStreaming) {
      setCanCollapse(false);
      return;
    }

    const body = bodyRef.current;
    if (!body) {
      return;
    }

    if (expanded) {
      return;
    }

    setCanCollapse(body.scrollHeight > body.clientHeight + 1);
  }, [content, expanded, isStreaming, maxLines]);

  useLayoutEffect(() => {
    if (isStreaming || expanded) {
      return undefined;
    }

    const body = bodyRef.current;
    if (!body || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      setCanCollapse(body.scrollHeight > body.clientHeight + 1);
    });
    observer.observe(body);

    return () => {
      observer.disconnect();
    };
  }, [content, expanded, isStreaming, maxLines]);

  return (
    <div className={cx('message__bubble-wrap', className)}>
      <div className={cx('message__bubble-surface', surfaceClassName)}>
        <div
          ref={bodyRef}
          className={cx('message__bubble-body', clamped && 'message__bubble-body--collapsed')}
          style={
            clamped
              ? ({
                  '--chat-message-collapse-lines': String(maxLines),
                } as CSSProperties)
              : undefined
          }
        >
          {children}
        </div>
        {canCollapse && !isStreaming ? (
          <Button
            aria-expanded={expanded}
            className={cx('message__collapse-toggle', toggleClassName)}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? 'Show less' : 'Show more'}
          </Button>
        ) : null}
        {footer ? <div className="message__bubble-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
