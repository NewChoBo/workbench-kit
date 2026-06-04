import type { ChangeEvent } from 'react';
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
  onValueChange,
  value,
  ...props
}: NumberInputProps & { controlWidth?: ControlWidth }) {
  const valueProps =
    value !== undefined ? { value } : defaultValue !== undefined ? { defaultValue } : {};

  return (
    <TextInput
      controlWidth={controlWidth}
      type="number"
      onValueChange={(next, event) => {
        const parsed = Number.parseFloat(next);
        if (!Number.isNaN(parsed)) {
          onValueChange?.(parsed, event);
        }
      }}
      {...valueProps}
      {...props}
    />
  );
}
