import type { JSX, ReactNode } from 'react';

import type { WorkbenchIconInput } from '../icons/types';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';
import { IconButton } from '../primitives/icon-button';
import { cx } from '../utils/cx';

export type WorkbenchPropertyOverrideResetAppearance = 'icon' | 'text';

export interface WorkbenchPropertyOverrideLabelProps {
  readonly label: ReactNode;
  readonly overridden: boolean;
  readonly onReset?: () => void;
  /** Storybook defaults OK; hosts should pass i18n strings. */
  readonly customBadgeLabel?: string;
  readonly defaultBadgeLabel?: string;
  /**
   * Accessible name for the Reset control. Used as `IconButton` label when
   * `resetAppearance` is `"icon"`, or as visible button text when `"text"`.
   */
  readonly resetLabel?: string;
  /** Dense inspectors default to icon; use `"text"` when the label must stay visible. */
  readonly resetAppearance?: WorkbenchPropertyOverrideResetAppearance;
  /** Codicon / host icon for icon Reset. Default `codicon-discard`. */
  readonly resetIcon?: WorkbenchIconInput;
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
  resetAppearance = 'icon',
  resetIcon = 'codicon-discard',
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
        resetAppearance === 'text' ? (
          <Button
            className="ui-workbench-property-override-label__reset"
            compact
            data-ui-workbench-property-override-reset="true"
            data-ui-workbench-property-override-reset-appearance="text"
            type="button"
            onClick={() => {
              onReset();
            }}
          >
            {resetLabel}
          </Button>
        ) : (
          <IconButton
            className="ui-workbench-property-override-label__reset"
            compact
            data-ui-workbench-property-override-reset="true"
            data-ui-workbench-property-override-reset-appearance="icon"
            icon={resetIcon}
            label={resetLabel}
            type="button"
            onClick={() => {
              onReset();
            }}
          />
        )
      ) : null}
    </span>
  );
}
