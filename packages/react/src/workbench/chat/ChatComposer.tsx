import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { IconButton } from '../../primitives/IconButton';
import { TextArea } from '../../primitives/TextArea';
import { cx } from '../../utils/cx';

export interface ChatComposerProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'onChange' | 'onSubmit' | 'value'
> {
  cancelLabel?: string;
  commandLabel?: string;
  commandSuggestPopover?: ReactNode;
  contextLabel?: string;
  isRunning?: boolean;
  onCancel?: () => void;
  onCommandClick?: () => void;
  onContextClick?: () => void;
  onSubmit: (message: string) => void;
  onValueChange: (value: string) => void;
  showTools?: boolean;
  submitLabel?: string;
  toolbarStart?: ReactNode;
  value: string;
}

export const ChatComposer = forwardRef<HTMLTextAreaElement, ChatComposerProps>(
  function ChatComposer(
    {
      cancelLabel = 'Stop response',
      className,
      commandLabel = 'Open commands',
      commandSuggestPopover,
      contextLabel = 'Add context',
      disabled,
      isRunning = false,
      onCancel,
      onCommandClick,
      onContextClick,
      onSubmit,
      onValueChange,
      placeholder = 'Type a message...',
      showTools = true,
      submitLabel = 'Send message',
      toolbarStart,
      value,
      ...props
    }: ChatComposerProps,
    ref,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => textareaRef.current!);

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
      if (!value || disabled || isRunning) return;

      onSubmit(value);
      window.requestAnimationFrame(() => {
        if (!textareaRef.current) return;

        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      });
    };

    const handleCommandClick = () => {
      onCommandClick?.();
      window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
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
        {commandSuggestPopover}
        <div className="composer__box">
          <TextArea
            ref={textareaRef}
            {...props}
            className={cx('composer__textarea', 'ui-workbench-scrollbar', className)}
            controlWidth="full"
            disabled={disabled}
            placeholder={placeholder}
            resize="none"
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
                  <IconButton
                    className="composer__tool-btn"
                    icon="add"
                    label={contextLabel}
                    onClick={onContextClick}
                  />
                  <IconButton
                    className="composer__tool-btn"
                    icon="terminal"
                    label={commandLabel}
                    onClick={handleCommandClick}
                  />
                </>
              ) : null}
            </div>
            <div className="composer__toolbar-right">
              {isRunning ? (
                <IconButton
                  className="composer__send-btn composer__send-btn--cancel"
                  icon="stop-circle"
                  label={cancelLabel}
                  onClick={onCancel}
                />
              ) : (
                <IconButton
                  className="composer__send-btn"
                  disabled={disabled || !value}
                  icon="send"
                  label={submitLabel}
                  onClick={handleSubmit}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
