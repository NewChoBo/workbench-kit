import type { ChangeEvent, KeyboardEvent } from 'react';
import { cx } from '../utils/cx';
import { IconButton } from './IconButton';
import { TextInput, type TextInputProps } from './TextInput';

export interface ClearableTextInputProps extends TextInputProps {
  clearLabel?: string;
  inputClassName?: string;
  onClear?: () => void;
  showClear?: boolean;
  wrapperClassName?: string;
}

function hasInputValue(value: TextInputProps['value']): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  return String(value).length > 0;
}

export function ClearableTextInput({
  className,
  clearLabel = 'Clear',
  inputClassName,
  onClear,
  onChange,
  onKeyDown,
  onValueChange,
  showClear,
  value,
  wrapperClassName,
  ...props
}: ClearableTextInputProps) {
  const shouldShowClear = showClear ?? hasInputValue(value);

  const handleClear = () => {
    onClear?.();

    if (!onClear && onValueChange) {
      onValueChange('', {
        currentTarget: { value: '' },
      } as ChangeEvent<HTMLInputElement>);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && shouldShowClear) {
      event.preventDefault();
      handleClear();
    }

    onKeyDown?.(event);
  };

  return (
    <div className={cx('ui-clearable-text-input', wrapperClassName, className)}>
      <TextInput
        {...props}
        className={cx('ui-clearable-text-input__input', inputClassName)}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onValueChange={onValueChange}
      />
      {shouldShowClear ? (
        <IconButton
          className="ui-clearable-text-input__clear"
          compact
          icon="codicon-close"
          label={clearLabel}
          onClick={handleClear}
        />
      ) : null}
    </div>
  );
}
