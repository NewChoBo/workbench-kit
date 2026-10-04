import './list.css';
import './list-item.css';
import './list-empty-state.css';
import {
  useLayoutEffect,
  useRef,
  useImperativeHandle,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';
import { IconButton } from '../icon-button';
import type { IconButtonProps } from '../icon-button';
import { cxCodicon } from '../../utils/codicon';
import { cx } from '../../utils/cx';

export interface ListProps extends ComponentPropsWithRef<'div'> {
  ariaLabel?: string;
}

interface ListOptionOwnership {
  lastWritten: string | null;
  release: () => void;
}

// A DOM option can move between mounted lists before either observer runs.
const listOptionOwners = new WeakMap<HTMLElement, ListOptionOwnership>();

/** Listbox navigation moves focus only; hosts retain selection and activation policy. */
export function List({ ariaLabel, className, role = 'listbox', ref, ...props }: ListProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useRef<((event: KeyboardEvent) => void) | undefined>(undefined);
  const managedRootTabIndex = useRef(-1);
  const callerRootTabIndex = useRef(props.tabIndex);
  useImperativeHandle(ref, () => rootRef.current!, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || role !== 'listbox') return;
    const ownedOptions = new Map<HTMLElement, ListOptionOwnership>();
    let current: HTMLElement | undefined;
    let currentIndex = 0;
    const active = document.activeElement;
    let focusWasInside =
      active === root ||
      (active instanceof Element &&
        active.closest('[role="option"]')?.closest('[role="listbox"]') === root);
    let disposed = false;
    const options = () =>
      Array.from(root.querySelectorAll<HTMLElement>('[role="option"]')).filter(
        (option) => option.closest('[role="listbox"]') === root,
      );
    const enabled = (option: HTMLElement) =>
      option.getAttribute('aria-disabled') !== 'true' &&
      !option.hasAttribute('disabled') &&
      !option.closest('[hidden], [inert], [aria-hidden="true"]');

    const sync = () => {
      if (disposed) return;
      const all = options();
      const owned = new Set(all);
      for (const [option, ownership] of ownedOptions) {
        if (!owned.has(option)) ownership.release();
      }
      const available = all.filter(enabled);
      const active = document.activeElement;
      const focused = available.find((option) => option === active);
      const selected = available.find((option) => option.getAttribute('aria-selected') === 'true');
      const shouldRestore =
        focusWasInside &&
        (active === document.body || active === root || all.some((option) => option === active));
      const next =
        focused ??
        (shouldRestore
          ? available.includes(current!)
            ? current
            : available[Math.min(currentIndex, available.length - 1)]
          : (selected ?? (available.includes(current!) ? current : available[0])));
      for (const option of all) {
        let ownership = ownedOptions.get(option);
        if (!ownership) {
          listOptionOwners.get(option)?.release();
          const original = option.getAttribute('tabindex');
          const acquired: ListOptionOwnership = {
            lastWritten: original,
            release: () => {
              if (listOptionOwners.get(option) === acquired) {
                // Preserve a caller's replacement instead of restoring over it.
                if (option.getAttribute('tabindex') === acquired.lastWritten) {
                  if (original === null) option.removeAttribute('tabindex');
                  else option.setAttribute('tabindex', original);
                }
                listOptionOwners.delete(option);
              }
              ownedOptions.delete(option);
            },
          };
          ownership = acquired;
          ownedOptions.set(option, acquired);
          listOptionOwners.set(option, acquired);
        }
        ownership.lastWritten = option === next ? '0' : '-1';
        option.setAttribute('tabindex', ownership.lastWritten);
      }
      managedRootTabIndex.current = available.length || (!all.length && !focusWasInside) ? -1 : 0;
      root.tabIndex = managedRootTabIndex.current;
      current = next;
      currentIndex = next ? available.indexOf(next) : 0;
      if (shouldRestore && !focused) (next ?? root).focus();
    };
    const focus = (event: FocusEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest('[role="listbox"]') === root &&
        (target === root || target.closest('[role="option"]'))
      ) {
        focusWasInside = true;
        sync();
      }
    };
    const blur = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && !root.contains(event.relatedTarget)) {
        focusWasInside = false;
        queueMicrotask(sync);
      } else if (event.relatedTarget === null) {
        const blurred = event.target;
        queueMicrotask(() => {
          if (
            blurred instanceof Node &&
            blurred.isConnected &&
            !root.contains(document.activeElement)
          )
            focusWasInside = false;
          sync();
        });
      }
    };
    const keydown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.isComposing
      )
        return;
      const target = event.target;
      // Nested controls and nested listboxes own their own keyboard interaction.
      if (
        !(target instanceof HTMLElement) ||
        target.getAttribute('role') !== 'option' ||
        target.closest('[role="listbox"]') !== root
      )
        return;
      const available = options().filter(enabled);
      const index = available.indexOf(target);
      if (index < 0) return;
      const horizontal = root.getAttribute('aria-orientation') === 'horizontal';
      const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown';
      const previousKey = horizontal ? 'ArrowLeft' : 'ArrowUp';
      const next =
        event.key === 'Home'
          ? available[0]
          : event.key === 'End'
            ? available[available.length - 1]
            : event.key === nextKey
              ? available[Math.min(index + 1, available.length - 1)]
              : event.key === previousKey
                ? available[Math.max(index - 1, 0)]
                : undefined;
      if (next) {
        event.preventDefault();
        next.focus();
      }
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'aria-selected',
        'aria-disabled',
        'disabled',
        'hidden',
        'inert',
        'aria-hidden',
        'role',
      ],
    });
    root.addEventListener('focusin', focus);
    root.addEventListener('focusout', blur);
    navigate.current = keydown;
    return () => {
      disposed = true;
      observer.disconnect();
      root.removeEventListener('focusin', focus);
      root.removeEventListener('focusout', blur);
      navigate.current = undefined;
      for (const ownership of ownedOptions.values()) ownership.release();
      // On role release, the following property effect owns the new caller value.
      // On unmount/StrictMode cleanup, restore the last committed caller value.
      if (root.getAttribute('role') === 'listbox') {
        if (callerRootTabIndex.current === undefined) root.removeAttribute('tabindex');
        else root.tabIndex = callerRootTabIndex.current;
      }
    };
  }, [role]);

  // Reapply our tab stop without restarting navigation or running focus recovery
  // ahead of queued blur events and DOM mutations.
  useLayoutEffect(() => {
    callerRootTabIndex.current = props.tabIndex;
    const root = rootRef.current;
    if (!root) return;
    if (role === 'listbox') root.tabIndex = managedRootTabIndex.current;
    else if (props.tabIndex === undefined) root.removeAttribute('tabindex');
    else root.tabIndex = props.tabIndex;
  }, [role, props.tabIndex]);

  return (
    <div
      aria-label={ariaLabel ?? props['aria-label']}
      className={cx('ui-list', 'ui-workbench-scrollbar', className)}
      role={role}
      {...props}
      ref={rootRef}
      onKeyDown={(event) => {
        props.onKeyDown?.(event);
        navigate.current?.(event.nativeEvent);
      }}
    />
  );
}

export interface ListItemProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  actions?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode | string;
  label: ReactNode;
  leading?: ReactNode;
  meta?: ReactNode;
  selected?: boolean;
}

export function ListItem({
  actions,
  className,
  description,
  icon,
  label,
  leading,
  meta,
  role = 'option',
  selected = false,
  tabIndex = 0,
  ...props
}: ListItemProps) {
  const hasDescription = description !== undefined && description !== null && description !== '';
  const resolvedIcon = typeof icon === 'string' ? <i className={cxCodicon(icon)} /> : icon;

  const leadingNode =
    leading != null ? (
      <span className="ui-list-item__icon">{leading}</span>
    ) : resolvedIcon ? (
      <span className="ui-list-item__icon">{resolvedIcon}</span>
    ) : null;

  return (
    <div
      aria-selected={selected}
      className={cx('ui-list-item', selected && 'ui-list-item--selected', className)}
      role={role}
      tabIndex={tabIndex}
      {...props}
    >
      {leadingNode}
      <span className="ui-list-item__content">
        <span className="ui-list-item__label">{label}</span>
        {hasDescription ? <span className="ui-list-item__description">{description}</span> : null}
      </span>
      {meta ? <span className="ui-list-item__meta">{meta}</span> : null}
      {actions ? <span className="ui-list-item__actions">{actions}</span> : null}
    </div>
  );
}

export type ListItemActionButtonProps = IconButtonProps;

function handleNestedListActionEvent<TEvent extends { stopPropagation(): void }>(
  event: TEvent,
  handler: ((event: TEvent) => void) | undefined,
) {
  event.stopPropagation();
  handler?.(event);
}

export function ListItemActionButton({
  compact = true,
  onClick,
  onDoubleClick,
  onPointerDown,
  ...props
}: ListItemActionButtonProps) {
  return (
    <IconButton
      compact={compact}
      onClick={(event) => handleNestedListActionEvent(event, onClick)}
      onDoubleClick={(event) => handleNestedListActionEvent(event, onDoubleClick)}
      onPointerDown={(event) => handleNestedListActionEvent(event, onPointerDown)}
      {...props}
    />
  );
}

export interface ListEmptyStateProps extends ComponentPropsWithRef<'div'> {
  tone?: 'error' | 'normal';
}

export function ListEmptyState({ className, tone = 'normal', ...props }: ListEmptyStateProps) {
  return (
    <div
      className={cx(
        'ui-list-empty-state',
        tone === 'error' && 'ui-list-empty-state--error',
        className,
      )}
      {...props}
    />
  );
}
