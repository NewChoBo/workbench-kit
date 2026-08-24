import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  formatKeybindingLabel,
  normalizeWorkbenchShortcutFromEvent,
  resolveWorkbenchShortcutPlatform,
  type WorkbenchShortcutPlatform,
} from '@workbench-kit/platform';
import { Button } from '../../primitives/button';
import { cx } from '../../utils/cx';

export interface KeybindingCaptureFieldProps {
  ariaDescribedBy?: string | undefined;
  ariaLabel?: string | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
  onCancel?: (() => void) | undefined;
  onChange: (key: string | undefined) => void;
  placeholder?: string | undefined;
  platform?: WorkbenchShortcutPlatform | undefined;
  value?: string | undefined;
}

export function KeybindingCaptureField({
  ariaDescribedBy,
  ariaLabel = 'Keyboard shortcut',
  className,
  disabled = false,
  onCancel,
  onChange,
  placeholder = 'Press keys to record',
  platform,
  value,
}: KeybindingCaptureFieldProps) {
  const fieldId = useId();
  const statusId = useId();
  const [recording, setRecording] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const resolvedPlatform = platform ?? resolveWorkbenchShortcutPlatform();

  useEffect(() => {
    if (disabled) {
      setRecording(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (!recording || disabled) {
      return undefined;
    }

    const finishRecording = () => {
      setRecording(false);
      buttonRef.current?.focus();
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Tab') {
        setRecording(false);
        onCancel?.();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (event.key === 'Escape') {
        onCancel?.();
        finishRecording();
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        onChange(undefined);
        finishRecording();
        return;
      }

      if (['Alt', 'Control', 'Meta', 'Shift'].includes(event.key)) {
        return;
      }

      const shortcut = normalizeWorkbenchShortcutFromEvent(event, resolvedPlatform);
      if (!shortcut) {
        return;
      }

      onChange(shortcut);
      finishRecording();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [disabled, onCancel, onChange, recording, resolvedPlatform]);

  const displayValue = value ? formatKeybindingLabel(value) : undefined;
  const describedBy = [statusId, ariaDescribedBy].filter(Boolean).join(' ');

  return (
    <div className={cx('workbench-keybinding-capture', className)}>
      <Button
        ref={buttonRef}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        className={cx(
          'workbench-keybinding-capture__trigger',
          recording && 'workbench-keybinding-capture__trigger--recording',
        )}
        disabled={disabled}
        data-workbench-shortcut-capture-recording={recording ? 'true' : undefined}
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
      </Button>
      <span aria-live="polite" className="ui-visually-hidden" id={statusId} role="status">
        {recording
          ? 'Recording keyboard shortcut. Press a key combination, Escape to cancel, or Tab to leave.'
          : ''}
      </span>
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
