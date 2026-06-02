import {
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { cx } from '../../utils/cx';

export interface ChatComposerProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'onChange' | 'onSubmit' | 'value'
> {
  cancelLabel?: string;
  commandLabel?: string;
  contextLabel?: string;
  isRunning?: boolean;
  onCancel?: () => void;
  onSubmit: (message: string) => void;
  onValueChange: (value: string) => void;
  showTools?: boolean;
  submitLabel?: string;
  toolbarStart?: ReactNode;
  value: string;
}

export function ChatComposer({
  cancelLabel = 'Stop response',
  className,
  commandLabel = 'Open commands',
  contextLabel = 'Add context',
  disabled,
  isRunning = false,
  onCancel,
  onSubmit,
  onValueChange,
  placeholder = 'Type a message...',
  showTools = true,
  submitLabel = 'Send message',
  toolbarStart,
  value,
  ...props
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = () => {
    const element = textareaRef.current;
    if (!element) return;

    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  };

  useLayoutEffect(() => {
    resizeTextarea();
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || isRunning) return;

    onSubmit(trimmed);
    window.requestAnimationFrame(() => {
      if (!textareaRef.current) return;

      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    props.onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="composer">
      <div className="composer__box">
        <textarea
          ref={textareaRef}
          {...props}
          className={cx('composer__textarea', className)}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          value={value}
          onChange={(event) => onValueChange(event.currentTarget.value)}
          onInput={resizeTextarea}
          onKeyDown={handleKeyDown}
        />
        <div className="composer__toolbar">
          <div className="composer__toolbar-left">
            {toolbarStart}
            {showTools ? (
              <>
                <button
                  aria-label={contextLabel}
                  className="composer__tool-btn"
                  title={contextLabel}
                  type="button"
                >
                  <i className="codicon codicon-add" />
                </button>
                <button
                  aria-label={commandLabel}
                  className="composer__tool-btn"
                  title={commandLabel}
                  type="button"
                >
                  <i className="codicon codicon-terminal" />
                </button>
              </>
            ) : null}
          </div>
          <div className="composer__toolbar-right">
            {isRunning ? (
              <button
                aria-label={cancelLabel}
                className="composer__send-btn composer__send-btn--cancel"
                title={cancelLabel}
                type="button"
                onClick={onCancel}
              >
                <i className="codicon codicon-stop-circle" />
              </button>
            ) : (
              <button
                aria-label={submitLabel}
                className="composer__send-btn"
                disabled={disabled || !value.trim()}
                title={submitLabel}
                type="button"
                onClick={handleSubmit}
              >
                <i className="codicon codicon-send" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
