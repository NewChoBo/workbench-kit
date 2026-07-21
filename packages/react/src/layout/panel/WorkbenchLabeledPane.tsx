import type { ComponentPropsWithRef, ElementType, ReactNode } from 'react';

import {
  ScrollArea,
  type ScrollAreaGutter,
  type ScrollAreaOrientation,
  type ScrollAreaScrollbarVisibility,
} from '../../primitives/scroll-area';
import { cx } from '../../utils/cx';

import './workbench-labeled-pane.css';

export type WorkbenchLabeledPaneChrome = 'flat' | 'card';
export type WorkbenchLabeledPaneTone = 'default' | 'muted';

export interface WorkbenchLabeledPaneProps extends Omit<ComponentPropsWithRef<'section'>, 'title'> {
  readonly as?: ElementType | undefined;
  readonly bodyClassName?: string | undefined;
  readonly bodyProps?: ComponentPropsWithRef<'div'> | undefined;
  readonly children?: ReactNode | undefined;
  /** `flat` fills the host editor (default). `card` keeps rounded bordered chrome. */
  readonly chrome?: WorkbenchLabeledPaneChrome | undefined;
  /** ScrollArea gutter on the pane body. Default `stable` so themed track space is reserved. */
  readonly gutter?: ScrollAreaGutter | undefined;
  readonly header?: ReactNode | undefined;
  readonly headerClassName?: string | undefined;
  /** ScrollArea orientation on the pane body. Default `vertical`. */
  readonly orientation?: ScrollAreaOrientation | undefined;
  /** Scrollbar visibility policy. Default `auto` (themed thin scrollbar). */
  readonly scrollbars?: ScrollAreaScrollbarVisibility | undefined;
  readonly title?: ReactNode | undefined;
  readonly tone?: WorkbenchLabeledPaneTone | undefined;
}

export function WorkbenchLabeledPane({
  as: Component = 'section',
  bodyClassName,
  bodyProps,
  children,
  chrome = 'flat',
  className,
  gutter = 'stable',
  header,
  headerClassName,
  orientation = 'vertical',
  scrollbars = 'auto',
  title,
  tone = 'default',
  ...props
}: WorkbenchLabeledPaneProps) {
  const { className: bodyPropsClassName, ...resolvedBodyProps } = bodyProps ?? {};
  const resolvedHeader = header ?? title;

  return (
    <Component
      className={cx(
        'ui-workbench-labeled-pane',
        chrome === 'card' ? 'ui-workbench-labeled-pane--card' : 'ui-workbench-labeled-pane--flat',
        tone === 'muted' && 'ui-workbench-labeled-pane--muted',
        className,
      )}
      data-chrome={chrome}
      {...props}
    >
      {resolvedHeader ? (
        <header className={cx('ui-workbench-labeled-pane__header', headerClassName)}>
          {resolvedHeader}
        </header>
      ) : null}
      <ScrollArea
        className={cx('ui-workbench-labeled-pane__body', bodyClassName, bodyPropsClassName)}
        gutter={gutter}
        orientation={orientation}
        scrollbars={scrollbars}
        {...resolvedBodyProps}
      >
        {children}
      </ScrollArea>
    </Component>
  );
}
