import type { HTMLAttributes } from 'react';
import { Codicon } from '../primitives/codicon/Codicon';
import { useWorkbenchIconResolver } from './WorkbenchIconContext';
import {
  isWorkbenchIconDescriptor,
  normalizeWorkbenchIconDescriptor,
} from './resolveWorkbenchIcon';
import type { WorkbenchIconInput } from './types';

export interface WorkbenchIconProps extends HTMLAttributes<HTMLSpanElement> {
  icon: WorkbenchIconInput;
  /** When set, exposes the icon to assistive tech instead of aria-hidden. */
  label?: string | undefined;
}

/**
 * Renders a workbench icon. String ids default to codicon; hosts may override
 * string resolution via `WorkbenchIconProvider`.
 */
export function WorkbenchIcon({ className, icon, label, ...props }: WorkbenchIconProps) {
  const resolveStringIcon = useWorkbenchIconResolver();
  const normalized = normalizeWorkbenchIconDescriptor(icon);

  if (isWorkbenchIconDescriptor(normalized)) {
    if (normalized.kind === 'node') {
      return (
        <span
          aria-hidden={label ? undefined : true}
          aria-label={label}
          className={className}
          {...props}
        >
          {normalized.node}
        </span>
      );
    }

    const codiconName = normalized.name;
    const resolved = resolveStringIcon?.(codiconName, { className, label });
    if (resolved !== undefined) {
      return <>{resolved}</>;
    }

    return <Codicon className={className} icon={codiconName} label={label} />;
  }

  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={className}
      {...props}
    >
      {normalized}
    </span>
  );
}
