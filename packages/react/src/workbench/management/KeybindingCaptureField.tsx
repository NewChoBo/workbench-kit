import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { formatKeybindingLabel } from '@workbench-kit/platform';
import { Button } from '../../primitives/Button';
import { cx } from '../../utils/cx';

export interface KeybindingCaptureFieldProps {
  ariaLabel?: string | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
  onCancel?: (() => void) | undefined;
  onChange: (key: string | undefined) => void;
  placeholder?: string | undefined;
  value?: string | undefined;
}

export function KeybindingCaptureField({
  ariaLabel = 'Keyboard shortcut',
  className,
  disabled = false,
  onCancel,
  onChange,
  placeholder = 'Press keys to record',
  value,
}: KeybindingCaptureFieldProps) {
  const fieldId = useId();
  const [recording, setRecording] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!recording) {
      return undefined;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Escape') {
        setRecording(false);
        onCancel?.();
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        onChange(undefined);
        setRecording(false);
        return;
      }

      if (event.key === 'Tab' || event.key === 'Shift') {
        return;
      }

      onChange(normalizeKeybindingKeyFromEvent(event));
      setRecording(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onCancel, onChange, recording]);

  const displayValue = value ? formatKeybindingLabel(value) : undefined;

  return (
    <div className={cx('workbench-keybinding-capture', className)}>
      <button
        ref={buttonRef}
        aria-label={ariaLabel}
        className={cx(
          'workbench-keybinding-capture__trigger',
          recording && 'workbench-keybinding-capture__trigger--recording',
        )}
        disabled={disabled}
        id={fieldId}
        type="button"
        onClick={() => {
          if (disabled) {
            return;
          }
          setRecording(true);
          buttonRef.current?.focus();
        }}
        onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
          if (disabled) {
            return;
          }

          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setRecording(true);
          }
        }}
      >
        {recording ? 'Press shortcut…' : (displayValue ?? placeholder)}
      </button>
      {value ? (
        <Button
          aria-label="Clear keyboard shortcut"
          compact
          disabled={disabled}
          type="button"
          onClick={() => {
            onChange(undefined);
            setRecording(false);
          }}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );
}

function normalizeKeybindingKeyFromEvent(
  event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'>,
): string {
  const parts: string[] = [];

  if (event.ctrlKey || event.metaKey) {
    parts.push('ctrl');
  }
  if (event.altKey) {
    parts.push('alt');
  }
  if (event.shiftKey) {
    parts.push('shift');
  }

  parts.push(normalizeKeyToken(event.key));
  return parts.join('+');
}

function normalizeKeyToken(token: string): string {
  const key = token.trim().toLowerCase();
  if (key === 'del') return 'delete';
  if (key === 'esc') return 'escape';
  if (key === 'return') return 'enter';
  if (key === 'spacebar' || key === 'space') return 'space';
  return key.length === 1 ? key : key;
}
