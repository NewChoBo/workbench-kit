import './library-facet-filter-dialog.css';
import type { ReactNode } from 'react';

import {
  LibraryFacetFilterPanel,
  type LibraryFacetFilterPanelProps,
} from '../../primitives/library-facet-filter-panel/LibraryFacetFilterPanel';
import {
  WorkbenchDialogFrame,
  type WorkbenchDialogBodyLayout,
  type WorkbenchDialogFrameSize,
} from './WorkbenchDialogFrame';

export interface LibraryFacetFilterDialogProps extends LibraryFacetFilterPanelProps {
  readonly ariaLabel: string;
  readonly bodyLayout?: WorkbenchDialogBodyLayout;
  readonly closeLabel: string;
  readonly dataAttributes?: Record<string, string>;
  readonly frameSize?: WorkbenchDialogFrameSize;
  readonly maximizeLabel?: string;
  readonly onClose: () => void;
  readonly restoreLabel?: string;
  readonly surfaceDataAttributes?: Record<string, string>;
  readonly title: ReactNode;
}

/**
 * Modal wrapper around `LibraryFacetFilterPanel` using `WorkbenchDialogFrame`.
 * Host owns filter state, schema mapping, and open/close.
 */
export function LibraryFacetFilterDialog({
  ariaLabel,
  bodyLayout = 'column-fill',
  closeLabel,
  dataAttributes,
  frameSize = 'metadata-editor',
  maximizeLabel,
  onClose,
  restoreLabel,
  surfaceDataAttributes,
  title,
  ...panelProps
}: LibraryFacetFilterDialogProps): ReactNode {
  return (
    <WorkbenchDialogFrame
      ariaLabel={ariaLabel}
      bodyLayout={bodyLayout}
      closeLabel={closeLabel}
      dataAttributes={dataAttributes}
      frameSize={frameSize}
      maximizeLabel={maximizeLabel}
      onClose={onClose}
      restoreLabel={restoreLabel}
      surfaceDataAttributes={surfaceDataAttributes}
      title={title}
    >
      <div className="ui-library-facet-filter-dialog" data-ui-library-facet-filter-dialog="true">
        <LibraryFacetFilterPanel {...panelProps} />
      </div>
    </WorkbenchDialogFrame>
  );
}
