import './catalog-filter-overlay.css';
import type { ComponentPropsWithRef, ReactNode, Ref } from 'react';

import { cx } from '../../utils/cx';
import { IconButton } from '../icon-button/IconButton';

export interface CatalogFilterOverlayProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'title'
> {
  readonly children: ReactNode;
  /**
   * When true, Clear stays mounted and sized but is not actionable.
   * Keeps the title row height stable across selection changes.
   */
  readonly clearDisabled?: boolean | undefined;
  readonly clearLabel: string;
  readonly onClear: () => void;
  readonly ref?: Ref<HTMLDivElement> | undefined;
  readonly title: ReactNode;
  readonly titleId: string;
}

/**
 * Presentational filter overlay shell: elevated surface, fixed-height header
 * (title + Clear), and a body slot for facet sections.
 * Hosts own portal mounting, positioning, and product copy.
 */
export function CatalogFilterOverlay({
  children,
  className,
  clearDisabled = false,
  clearLabel,
  onClear,
  ref,
  title,
  titleId,
  ...props
}: CatalogFilterOverlayProps) {
  return (
    <div
      {...props}
      ref={ref}
      aria-labelledby={titleId}
      className={cx('ui-catalog-filter-overlay', className)}
      data-ui-catalog-filter-overlay="true"
      role="dialog"
    >
      <header className="ui-catalog-filter-overlay__header">
        <h2 className="ui-catalog-filter-overlay__title" id={titleId}>
          {title}
        </h2>
        <IconButton
          className="ui-catalog-filter-overlay__clear"
          compact
          disabled={clearDisabled}
          icon="codicon-clear-all"
          label={clearLabel}
          onClick={() => {
            if (!clearDisabled) {
              onClear();
            }
          }}
        />
      </header>
      <div className="ui-catalog-filter-overlay__body">{children}</div>
    </div>
  );
}
