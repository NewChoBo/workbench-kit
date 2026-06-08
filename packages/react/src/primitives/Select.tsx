import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { ControlWidth } from './TextInput';
import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';

export interface SelectProps extends ComponentPropsWithRef<'select'> {
  controlWidth?: ControlWidth;
  onValueChange?: (value: string, event: ChangeEvent<HTMLSelectElement>) => void;
}

interface ParsedOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

function isOptionElement(child: ReactNode): child is ReactElement<ComponentPropsWithRef<'option'>> {
  return isValidElement(child) && child.type === 'option';
}

function parseOptions(children: ReactNode): ParsedOption[] {
  return Children.toArray(children)
    .filter(isOptionElement)
    .map((child) => ({
      value: String(child.props.value ?? ''),
      label: child.props.children ?? child.props.value ?? '',
      disabled: child.props.disabled,
    }));
}

function getEnabledOptionIndex(options: ParsedOption[], startIndex: number, direction: 1 | -1) {
  if (options.length === 0) return -1;

  let index = startIndex;
  for (let step = 0; step < options.length; step += 1) {
    index = (index + direction + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }

  return -1;
}

type ListboxPlacement = 'bottom' | 'top';

interface ListboxPosition {
  bottom?: number;
  left: number;
  maxHeight: number;
  placement: ListboxPlacement;
  top?: number;
  width: number;
}

const LISTBOX_MAX_HEIGHT = 240;
const LISTBOX_VIEWPORT_PADDING = 8;

function measureListboxPosition(container: HTMLElement): ListboxPosition | null {
  const trigger = container.querySelector<HTMLElement>('.ui-select__trigger');
  if (!trigger) return null;

  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - LISTBOX_VIEWPORT_PADDING;
  const spaceAbove = rect.top - LISTBOX_VIEWPORT_PADDING;
  const placement: ListboxPlacement =
    spaceBelow >= 120 || spaceBelow >= spaceAbove ? 'bottom' : 'top';
  const availableSpace = placement === 'bottom' ? spaceBelow : spaceAbove;
  const maxHeight = Math.max(80, Math.min(LISTBOX_MAX_HEIGHT, availableSpace));

  if (placement === 'bottom') {
    return {
      left: rect.left,
      width: rect.width,
      top: rect.bottom - 1,
      maxHeight,
      placement,
    };
  }

  return {
    left: rect.left,
    width: rect.width,
    bottom: window.innerHeight - rect.top + 1,
    maxHeight,
    placement,
  };
}

export function Select({
  className,
  controlWidth = 'default',
  defaultValue,
  disabled = false,
  id,
  onChange,
  onValueChange,
  value,
  children,
  'aria-describedby': ariaDescribedBy,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...nativeSelectProps
}: SelectProps) {
  const options = parseOptions(children);
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const nativeSelectRef = useRef<HTMLSelectElement>(null);
  const [open, setOpen] = useState(false);
  const [listboxPosition, setListboxPosition] = useState<ListboxPosition | null>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(() =>
    String(defaultValue ?? options.find((option) => !option.disabled)?.value ?? ''),
  );
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const isControlled = value !== undefined;
  const currentValue = isControlled ? String(value) : uncontrolledValue;
  const selectedIndex = options.findIndex((option) => option.value === currentValue);
  const selectedOption =
    selectedIndex >= 0 ? options[selectedIndex] : options.find((option) => !option.disabled);

  const commitValue = (nextValue: string) => {
    const nativeSelect = nativeSelectRef.current;
    if (!nativeSelect) return;

    nativeSelect.value = nextValue;
    if (!isControlled) {
      setUncontrolledValue(nextValue);
    }

    const event = new Event('change', { bubbles: true });
    nativeSelect.dispatchEvent(event);
  };

  const handleNativeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (!isControlled) {
      setUncontrolledValue(event.currentTarget.value);
    }
    onChange?.(event);
    onValueChange?.(event.currentTarget.value, event);
  };

  const closeListbox = () => {
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const openListbox = (preferredIndex = selectedIndex >= 0 ? selectedIndex : 0) => {
    if (disabled) return;
    setOpen(true);
    setHighlightedIndex(getEnabledOptionIndex(options, preferredIndex, 1));
  };

  const selectOption = (option: ParsedOption | undefined) => {
    if (!option || option.disabled) return;
    commitValue(option.value);
    closeListbox();
  };

  const updateListboxPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    setListboxPosition(measureListboxPosition(container));
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setListboxPosition(null);
      return;
    }

    updateListboxPosition();
    window.addEventListener('resize', updateListboxPosition);
    window.addEventListener('scroll', updateListboxPosition, true);
    return () => {
      window.removeEventListener('resize', updateListboxPosition);
      window.removeEventListener('scroll', updateListboxPosition, true);
    };
  }, [open, updateListboxPosition]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (listboxRef.current?.contains(target)) return;
      closeListbox();
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeListbox();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!open) {
          openListbox();
          return;
        }
        break;
      case 'Escape':
        event.preventDefault();
        closeListbox();
        return;
      case 'Home':
        event.preventDefault();
        setHighlightedIndex(getEnabledOptionIndex(options, -1, 1));
        return;
      case 'End':
        event.preventDefault();
        setHighlightedIndex(getEnabledOptionIndex(options, 0, -1));
        return;
      default:
        return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      selectOption(options[highlightedIndex]);
      return;
    }

    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const baseIndex = highlightedIndex >= 0 ? highlightedIndex : Math.max(selectedIndex, 0);
    setHighlightedIndex(getEnabledOptionIndex(options, baseIndex, direction));
  };

  const listbox =
    open && listboxPosition ? (
      <ul
        ref={listboxRef}
        className={cx(
          'ui-select__listbox',
          'ui-select__listbox--floating',
          listboxPosition.placement === 'top' && 'ui-select__listbox--placement-top',
        )}
        id={listboxId}
        role="listbox"
        style={{
          position: 'fixed',
          left: listboxPosition.left,
          width: listboxPosition.width,
          maxHeight: listboxPosition.maxHeight,
          ...(listboxPosition.placement === 'bottom'
            ? { top: listboxPosition.top }
            : { bottom: listboxPosition.bottom }),
        }}
      >
        {options.map((option, index) => {
          const isSelected = option.value === currentValue;
          const isHighlighted = index === highlightedIndex;

          return (
            <li
              key={option.value}
              aria-disabled={option.disabled ? 'true' : undefined}
              aria-selected={isSelected}
              className={cx(
                'ui-select__option',
                isSelected && 'ui-select__option--selected',
                isHighlighted && 'ui-select__option--highlighted',
              )}
              role="option"
              onMouseEnter={() => !option.disabled && setHighlightedIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(option)}
            >
              {option.label}
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <div
      ref={containerRef}
      className={cx('ui-select', className)}
      data-listbox-floating="true"
      data-open={open ? 'true' : 'false'}
      data-width={controlWidth}
    >
      <button
        aria-controls={listboxId}
        aria-describedby={ariaDescribedBy}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className="ui-select__trigger"
        disabled={disabled}
        id={id}
        role="combobox"
        type="button"
        onClick={() => (open ? closeListbox() : openListbox())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="ui-select__value">{selectedOption?.label}</span>
        <span aria-hidden="true" className="ui-select__chevron">
          <i className={cxCodicon('chevron-down')} />
        </span>
      </button>

      {listbox ? createPortal(listbox, document.body) : null}

      <select
        ref={nativeSelectRef}
        aria-hidden="true"
        className="ui-select__native"
        disabled={disabled}
        tabIndex={-1}
        value={currentValue}
        onChange={handleNativeChange}
        {...nativeSelectProps}
      >
        {children}
      </select>
    </div>
  );
}
