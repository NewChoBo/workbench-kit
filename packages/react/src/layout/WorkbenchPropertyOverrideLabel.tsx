import type { JSX, ReactNode } from 'react';

import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';
import { cx } from '../utils/cx';

export interface WorkbenchPropertyOverrideLabelProps {
  readonly label: ReactNode;
  readonly overridden: boolean;
  readonly onReset?: () => void;
  /** Storybook defaults OK; hosts should pass i18n strings. */
  readonly customBadgeLabel?: string;
  readonly defaultBadgeLabel?: string;
  readonly resetLabel?: string;
  readonly className?: string;
}

/**
 * Sparse-override inspector label chrome: Custom/Default badge + optional Reset.
 * Compose into `Field label={...}` — hosts own override detection and reset writes.
 */
export function WorkbenchPropertyOverrideLabel({
  className,
  customBadgeLabel = 'Custom',
  defaultBadgeLabel = 'Default',
  label,
  onReset,
  overridden,
  resetLabel = 'Reset',
}: WorkbenchPropertyOverrideLabelProps): JSX.Element {
  const showReset = overridden && onReset != null;

  return (
    <span className={cx('ui-workbench-property-override-label', className)}>
      <span className="ui-workbench-property-override-label__main">
        <span className="ui-workbench-property-override-label__text">{label}</span>
        <Badge
          className="ui-workbench-property-override-label__badge"
          data-ui-workbench-property-override-badge={overridden ? 'custom' : 'default'}
          variant={overridden ? 'accent' : 'muted'}
        >
          {overridden ? customBadgeLabel : defaultBadgeLabel}
        </Badge>
      </span>
      {showReset ? (
        <Button
          className="ui-workbench-property-override-label__reset"
          compact
          data-ui-workbench-property-override-reset="true"
          type="button"
          onClick={() => {
            onReset();
          }}
        >
          {resetLabel}
        </Button>
      ) : null}
    </span>
  );
}
