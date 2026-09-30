import {
  Children,
  isValidElement,
  type ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { ParsedOption } from './types';

function isOptionElement(child: ReactNode): child is ReactElement<ComponentPropsWithRef<'option'>> {
  return isValidElement(child) && child.type === 'option';
}

function getPlainOptionText(children: ReactNode): string | undefined {
  if (children == null || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (!Array.isArray(children)) return undefined;

  let text = '';
  for (const child of children) {
    const childText = getPlainOptionText(child);
    if (childText === undefined) return undefined;
    text += childText;
  }
  return text;
}

function getOptionValue(props: ComponentPropsWithRef<'option'>): string {
  if (props.value != null) return String(props.value);
  return (getPlainOptionText(props.children) ?? '')
    .replace(/[\t\n\f\r ]+/g, ' ')
    .replace(/^ | $/g, '');
}

export function parseOptions(children: ReactNode): ParsedOption[] {
  return Children.toArray(children)
    .filter(isOptionElement)
    .map((child) => ({
      value: getOptionValue(child.props),
      label: child.props.children ?? child.props.value ?? '',
      disabled: Boolean(child.props.disabled),
    }));
}

export function getEnabledOptionIndex(
  options: ParsedOption[],
  startIndex: number,
  direction: 1 | -1,
) {
  if (options.length === 0) return -1;

  let index = startIndex;
  for (let step = 0; step < options.length; step += 1) {
    index = (index + direction + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }

  return -1;
}
