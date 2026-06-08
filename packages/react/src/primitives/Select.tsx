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
  type CSSProperties,
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

type ListboxPlacement = 'bottom' | 'top';

interface OverlayPosition {
  left: number;
  maxHeight: number;
  placement: ListboxPlacement;
  triggerBottom: number;
  triggerTop: number;
  width: number;
}

const LISTBOX_MAX_HEIGHT = 240;
const LISTBOX_OPTION_HEIGHT = 28;
const VIEWPORT_PADDING = 8;

function isOptionElement(child: ReactNode): child is ReactElement<ComponentPropsWithRef<'option'>> {
  return isValidElement(child) && child.type === 'option';
}

function parseOptions(children: ReactNode): ParsedOption[] {
  return Children.toArray(children)
    .filter(isOptionElement)
    .map((child) => ({
      value: String(child.props.value ?? ''),
      label: child.props.children ?? child.props.value ?? '',
      disabled: Boolean(child.props.disabled),
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

function isTriggerVisible(trigger: HTMLElement) {
  const rect = trigger.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (rect.bottom <= 0 || rect.top >= window.innerHeight) return false;
  if (rect.right <= 0 || rect.left >= window.innerWidth) return false;

  if (typeof trigger.checkVisibility === 'function') {
    return trigger.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  }

  return true;
}

function measureOverlayPosition(trigger: HTMLElement, optionCount: number): OverlayPosition | null {
  const rect = trigger.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  const idealHeight = Math.min(LISTBOX_MAX_HEIGHT, optionCount * LISTBOX_OPTION_HEIGHT + 8);
  const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - VIEWPORT_PADDING);
  const spaceAbove = Math.max(0, rect.top - VIEWPORT_PADDING);
  const placement: ListboxPlacement =
    spaceBelow >= idealHeight || spaceBelow >= spaceAbove ? 'bottom' : 'top';
  const available = placement === 'bottom' ? spaceBelow : spaceAbove;
  const minHeight = LISTBOX_OPTION_HEIGHT + 8;
  const maxHeight = Math.min(LISTBOX_MAX_HEIGHT, idealHeight, Math.max(minHeight, available));

  return {
    placement,
    left: rect.left,
    width: rect.width,
    maxHeight,
    triggerTop: rect.top,
    triggerBottom: rect.bottom,
  };
}

function overlayListboxStyle(position: OverlayPosition): CSSProperties {
  const base: CSSProperties = {
    left: position.left,
    width: position.width,
    maxHeight: position.maxHeight,
  };

  if (position.placement === 'bottom') {
    return { ...base, top: position.triggerBottom };
  }

  return {
    ...base,
    top: position.triggerTop,
    transform: 'translateY(-100%)',
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const nativeSelectRef = useRef<HTMLSelectElement>(null);
  const [open, setOpen] = useState(false);
  const [overlayPosition, setOverlayPosition] = useState<OverlayPosition | null>(null);
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

    nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const handleNativeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (!isControlled) {
      setUncontrolledValue(event.currentTarget.value);
    }
    onChange?.(event);
    onValueChange?.(event.currentTarget.value, event);
  };

  const closeListbox = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

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

  const updateOverlayPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    if (!isTriggerVisible(trigger)) {
      closeListbox();
      return;
    }

    const position = measureOverlayPosition(trigger, options.length);
    if (!position) {
      closeListbox();
      return;
    }

    setOverlayPosition(position);
  }, [closeListbox, options.length]);

  useLayoutEffect(() => {
    if (!open) {
      setOverlayPosition(null);
      return;
    }

    updateOverlayPosition();
    window.addEventListener('resize', updateOverlayPosition);
    window.addEventListener('scroll', updateOverlayPosition, true);
    return () => {
      window.removeEventListener('resize', updateOverlayPosition);
      window.removeEventListener('scroll', updateOverlayPosition, true);
    };
  }, [open, updateOverlayPosition]);

  useEffect(() => {
    if (!open) return;

    const trigger = triggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) {
          closeListbox();
        }
      },
      { threshold: 0 },
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [closeListbox, open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (listboxRef.current?.contains(target)) return;
      closeListbox();
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') closeListbox();
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeListbox, open]);

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
    open && overlayPosition ? (
      <ul
        ref={listboxRef}
        className="ui-select__listbox ui-select__listbox--overlay"
        data-placement={overlayPosition.placement}
        id={listboxId}
        role="listbox"
        style={overlayListboxStyle(overlayPosition)}
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
      data-open={open ? 'true' : 'false'}
      data-width={controlWidth}
    >
      <button
        ref={triggerRef}
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
