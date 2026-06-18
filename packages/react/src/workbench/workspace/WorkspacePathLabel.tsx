import { workspacePathSegments } from './path';
import { cx } from '../../utils/cx';

export interface WorkspacePathLabelProps {
  className?: string;
  path: string;
}

export function WorkspacePathLabel({ className, path }: WorkspacePathLabelProps) {
  const segments = workspacePathSegments(path);

  if (segments.length === 0) {
    return null;
  }

  if (segments.length === 1) {
    return <span className={cx('workspace-path-label', className)} title={path}>{segments[0]}</span>;
  }

  return (
    <span className={cx('workspace-path-label', className)} title={path}>
      {segments.map((segment, index) => (
        <span className="workspace-path-label__segment" key={`${index}-${segment}`}>
          {index > 0 ? <span className="workspace-path-label__separator">{' > '}</span> : null}
          <span
            className={
              index === segments.length - 1
                ? 'workspace-path-label__leaf'
                : 'workspace-path-label__crumb'
            }
          >
            {segment}
          </span>
        </span>
      ))}
    </span>
  );
}
