import type { ReactNode } from 'react';
import type { GenericWidget } from '@workbench-kit/jdw';

import { renderBuiltinWidgetLeaf } from './renderBuiltinWidgetLeaf.js';

/**
 * Legacy builtin build hook kept leaf-only.
 * Container layout belongs to the Strategy A pipeline: layoutWidget -> cssRenderBackend.
 */
export function renderBuiltinWidgetNode(widget: GenericWidget): ReactNode {
  return renderBuiltinWidgetLeaf(widget);
}
