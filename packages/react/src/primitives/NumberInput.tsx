import type { ChangeEvent, InputEvent } from 'react';
import { TextInput } from './TextInput';
import type { ControlWidth, TextInputProps } from './TextInput';

export interface NumberInputProps extends Omit<
  TextInputProps,
  'defaultValue' | 'onValueChange' | 'type' | 'value'
> {
  defaultValue?: number | undefined;
  onValueChange?: (value: number, event: ChangeEvent<HTMLInputElement>) => void;
  value?: number | undefined;
}

export function NumberInput({
  controlWidth = 'default',
  defaultValue,
  onChange,
  onInput,
  onValueChange,
  value,
  ...props
}: NumberInputProps & { controlWidth?: ControlWidth }) {
  const valueProps =
    value !== undefined ? { value } : defaultValue !== undefined ? { defaultValue } : {};

  const emitValueChange = (rawValue: string, event: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number.parseFloat(rawValue);
    if (!Number.isNaN(parsed)) {
      onValueChange?.(parsed, event);
    }
  };

  const handleInput = (event: InputEvent<HTMLInputElement>) => {
    onInput?.(event);
    emitValueChange(event.currentTarget.value, event as unknown as ChangeEvent<HTMLInputElement>);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    if ((event.nativeEvent as Event).type !== 'input') {
      emitValueChange(event.currentTarget.value, event);
    }
  };

  return (
    <TextInput
      controlWidth={controlWidth}
      type="number"
      onChange={handleChange}
      onInput={handleInput}
      {...valueProps}
      {...props}
    />
  );
}
