import type { ComponentPropsWithRef } from 'react';
import { cx } from '../../utils/cx';
import {
  WorkbenchStructuredDataSchemaPanel,
  type WorkbenchStructuredDataSchemaPanelProps,
} from './StructuredDataSchemaPanel';

export interface WorkbenchStructuredDataSchemaPanelEmbedProps
  extends WorkbenchStructuredDataSchemaPanelProps,
    Omit<ComponentPropsWithRef<'div'>, 'children'> {}

export function WorkbenchStructuredDataSchemaPanelEmbed({
  className,
  fill = true,
  ...panelProps
}: WorkbenchStructuredDataSchemaPanelEmbedProps) {
  return (
    <div className={cx('ui-workbench-structured-data-schema-panel-embed', className)}>
      <WorkbenchStructuredDataSchemaPanel {...panelProps} fill={fill} />
    </div>
  );
}
