import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../../utils/cx';
import {
  WorkbenchStructuredDataSchemaPanelEmbed,
  type WorkbenchStructuredDataSchemaPanelEmbedProps,
} from './StructuredDataSchemaPanelEmbed';

export interface WorkbenchStructuredDataSchemaPanelFrameHeaderContent {
  eyebrow?: ReactNode | undefined;
  icon?: ReactNode | undefined;
  meta?: ReactNode | undefined;
  subtitle?: ReactNode | undefined;
  title?: ReactNode | undefined;
}

export interface WorkbenchStructuredDataSchemaPanelFrameProps
  extends WorkbenchStructuredDataSchemaPanelEmbedProps {
  frameClassName?: string | undefined;
  frameProps?: Omit<ComponentPropsWithRef<'div'>, 'children' | 'className'> | undefined;
  header?: ReactNode | undefined;
  headerClassName?: string | undefined;
  headerContent?: WorkbenchStructuredDataSchemaPanelFrameHeaderContent | undefined;
}

function renderFrameHeaderContent(content: WorkbenchStructuredDataSchemaPanelFrameHeaderContent) {
  return (
    <>
      <div className="ui-workbench-structured-data-schema-panel-frame__title-group">
        {content.icon ? (
          <span className="ui-workbench-structured-data-schema-panel-frame__icon">{content.icon}</span>
        ) : null}
        <div>
          {content.eyebrow ? (
            <span className="ui-workbench-structured-data-schema-panel-frame__eyebrow">
              {content.eyebrow}
            </span>
          ) : null}
          {content.title ? <h2>{content.title}</h2> : null}
          {content.subtitle ? <p>{content.subtitle}</p> : null}
        </div>
      </div>
      {content.meta ? (
        <div className="ui-workbench-structured-data-schema-panel-frame__meta">{content.meta}</div>
      ) : null}
    </>
  );
}

export function WorkbenchStructuredDataSchemaPanelFrame({
  header,
  headerClassName,
  headerContent,
  frameClassName,
  frameProps,
  className,
  ...panelProps
}: WorkbenchStructuredDataSchemaPanelFrameProps) {
  const resolvedHeader = header ?? (headerContent ? renderFrameHeaderContent(headerContent) : null);

  return (
    <div
      className={cx('ui-workbench-structured-data-schema-panel-frame', frameClassName)}
      {...frameProps}
    >
      {resolvedHeader ? (
        <header
          className={cx('ui-workbench-structured-data-schema-panel-frame__header', headerClassName)}
        >
          {resolvedHeader}
        </header>
      ) : null}
      <WorkbenchStructuredDataSchemaPanelEmbed {...panelProps} className={className} />
    </div>
  );
}
