import './number-input.css';

import {
  useRef,
  type ChangeEvent,
  type InputEvent,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
} from 'react';
import { Codicon } from '../codicon/Codicon';
import { TextInput } from '../text-input';
import type { ControlWidth, TextInputProps } from '../text-input';
import { cx } from '../../utils/cx';

export interface NumberInputProps extends Omit<
  TextInputProps,
  'defaultValue' | 'onValueChange' | 'type' | 'value'
> {
  defaultValue?: number;
  /**
   * When true, `undefined` renders as an empty field. Clearing the input calls
   * `onEmptyValue` (preferred) instead of `onValueChange`.
   */
  nullable?: boolean;
  /** Fired when a nullable field is cleared. */
  onEmptyValue?: () => void;
  onValueChange?: (value: number, event: ChangeEvent<HTMLInputElement>) => void;
  value?: number;
}

function resolveStep(step: TextInputProps['step']): number {
  if (step === undefined || step === 'any') {
    return 1;
  }
  const parsed = typeof step === 'number' ? step : Number.parseFloat(String(step));
  return Number.isFinite(parsed) && parsed !== 0 ? Math.abs(parsed) : 1;
}

function resolveBound(value: TextInputProps['min' | 'max']): number | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function clamp(value: number, min: number | undefined, max: number | undefined): number {
  let next = value;
  if (min !== undefined && next < min) {
    next = min;
  }
  if (max !== undefined && next > max) {
    next = max;
  }
  return next;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) {
    return;
  }
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  (ref as { current: T | null }).current = value;
}

export function NumberInput({
  className,
  controlWidth = 'default',
  defaultValue,
  disabled,
  max,
  min,
  nullable = false,
  onChange,
  onEmptyValue,
  onInput,
  onKeyDown,
  onValueChange,
  ref,
  step,
  value,
  ...props
}: NumberInputProps & { controlWidth?: ControlWidth }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const stepAmount = resolveStep(step);
  const minBound = resolveBound(min);
  const maxBound = resolveBound(max);
  const isControlled = value !== undefined || nullable;

  const emitParsed = (rawValue: string, event: ChangeEvent<HTMLInputElement>) => {
    if (rawValue.trim() === '') {
      if (nullable) {
        onEmptyValue?.();
      }
      return;
    }
    const parsed = Number.parseFloat(rawValue);
    if (!Number.isNaN(parsed)) {
      onValueChange?.(parsed, event);
    }
  };

  const readCurrentNumber = (): number | undefined => {
    if (isControlled) {
      return value;
    }
    const raw = inputRef.current?.value ?? '';
    if (raw.trim() === '') {
      return undefined;
    }
    const parsed = Number.parseFloat(raw);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const commitSteppedValue = (next: number) => {
    if (disabled) {
      return;
    }
    const clamped = clamp(next, minBound, maxBound);
    const input = inputRef.current;
    if (input && !isControlled) {
      input.value = String(clamped);
    }
    onValueChange?.(clamped, {
      currentTarget: input ?? ({ value: String(clamped) } as HTMLInputElement),
      target: input ?? ({ value: String(clamped) } as HTMLInputElement),
    } as ChangeEvent<HTMLInputElement>);
  };

  const stepBy = (direction: 1 | -1) => {
    const current = readCurrentNumber();
    const base =
      current === undefined ? (direction === 1 ? (minBound ?? 0) : (maxBound ?? 0)) : current;
    commitSteppedValue(base + direction * stepAmount);
  };

  const handleInput = (event: InputEvent<HTMLInputElement>) => {
    onInput?.(event);
    emitParsed(event.currentTarget.value, event as unknown as ChangeEvent<HTMLInputElement>);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    if ((event.nativeEvent as Event).type !== 'input') {
      emitParsed(event.currentTarget.value, event);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled) {
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      stepBy(1);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      stepBy(-1);
    }
  };

  const handleStepMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const current = readCurrentNumber();
  const decrementDisabled =
    Boolean(disabled) || (current !== undefined && minBound !== undefined && current <= minBound);
  const incrementDisabled =
    Boolean(disabled) || (current !== undefined && maxBound !== undefined && current >= maxBound);

  const valueProps = isControlled
    ? { value: value === undefined ? '' : value }
    : defaultValue !== undefined
      ? { defaultValue }
      : {};

  return (
    <div
      className={cx('ui-number-input', className)}
      data-disabled={disabled ? 'true' : undefined}
      data-width={controlWidth}
    >
      <TextInput
        {...props}
        {...valueProps}
        className="ui-number-input__field"
        controlWidth="full"
        disabled={disabled}
        max={max}
        min={min}
        ref={(node) => {
          inputRef.current = node;
          assignRef(ref, node);
        }}
        step={step}
        type="number"
        onChange={handleChange}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
      />
      <div className="ui-number-input__spinners">
        <button
          aria-label="Increment"
          className="ui-number-input__step"
          disabled={incrementDisabled}
          tabIndex={-1}
          type="button"
          onClick={() => stepBy(1)}
          onMouseDown={handleStepMouseDown}
        >
          <Codicon icon="chevron-up" />
        </button>
        <button
          aria-label="Decrement"
          className="ui-number-input__step"
          disabled={decrementDisabled}
          tabIndex={-1}
          type="button"
          onClick={() => stepBy(-1)}
          onMouseDown={handleStepMouseDown}
        >
          <Codicon icon="chevron-down" />
        </button>
      </div>
    </div>
  );
}
