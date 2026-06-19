import type { CSSProperties } from 'react';
import {
  VS_CODE_TREE_BASE_INDENT,
  VS_CODE_TREE_INDENT_SIZE,
  workbenchTreeIndentOffset,
} from '../../layout/layoutHelpers';

export function explorerTreeDepthStyle(depth: number, style?: CSSProperties): CSSProperties {
  return {
    '--depth': depth,
    '--ui-side-bar-tree-indent-offset': workbenchTreeIndentOffset(
      depth,
      VS_CODE_TREE_INDENT_SIZE,
      VS_CODE_TREE_BASE_INDENT,
    ),
    ...style,
  } as CSSProperties;
}
