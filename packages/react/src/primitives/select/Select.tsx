import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import type { ControlWidth } from '../TextInput';
import { cxCodicon } from '../../utils/codicon';
import { cx } from '../../utils/cx';
import { getEnabledOptionIndex, parseOptions } from './options';
import { isTriggerVisible, measureOverlayPosition, overlayListboxStyle } from './overlay';
import type { OverlayPosition, ParsedOption } from './types';

export interface SelectProps extends ComponentPropsWithRef<'select'> {
  controlWidth?: ControlWidth;
  onValueChange?: (value: string, event: ChangeEvent<HTMLSelectElement>) => void;
}

/**
 * Portaling straight to `document.body` escapes the workbench root (`[data-theme-preset]`),
 * which re-declares theme tokens locally and shadows whatever a contributed theme overrides
 * on `document.documentElement`. Staying inside that root keeps the listbox in sync with the
 * trigger it belongs to.
 */
function resolvePortalContainer(trigger: HTMLElement | null): HTMLElement {
  return trigger?.closest<HTMLElement>('[data-theme-preset], [data-theme]') ?? document.body;
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
        className="ui-select__listbox ui-workbench-scrollbar"
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
              <span className="ui-select__option-check" aria-hidden="true">
                {isSelected ? <i className={cxCodicon('check')} /> : null}
              </span>
              <span className="ui-select__option-label">{option.label}</span>
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <div ref={containerRef} className={cx('ui-select', className)} data-width={controlWidth}>
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

      {listbox ? createPortal(listbox, resolvePortalContainer(triggerRef.current)) : null}

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
