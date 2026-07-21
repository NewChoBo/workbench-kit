import type { ReactNode } from 'react';

/** Built-in VS Code codicon glyph (requires `@vscode/codicons` CSS in the host app). */
export interface WorkbenchCodiconDescriptor {
  kind: 'codicon';
  name: string;
}

/** Host-provided icon node (SVG, image, third-party icon component, etc.). */
export interface WorkbenchIconNodeDescriptor {
  kind: 'node';
  node: ReactNode;
}

export type WorkbenchIconDescriptor = WorkbenchCodiconDescriptor | WorkbenchIconNodeDescriptor;

/**
 * Icon input for workbench components.
 * A bare string is treated as a codicon name for backward compatibility.
 */
export type WorkbenchIconInput = string | WorkbenchIconDescriptor | ReactNode;

export interface WorkbenchIconRenderProps {
  className?: string | undefined;
  label?: string | undefined;
}

export type WorkbenchIconResolver = (icon: string, props: WorkbenchIconRenderProps) => ReactNode;
