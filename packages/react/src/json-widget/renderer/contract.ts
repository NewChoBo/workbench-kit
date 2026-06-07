import type { ReactElement } from 'react';
import type {
  WidgetRendererEvent,
  WidgetRendererProps as SharedWidgetRendererProps,
  WidgetRendererRect,
  WidgetRendererShape,
} from '@workbench-kit/contracts';
import type { GenericWidget } from '@workbench-kit/json-widget';

/**
 * React-specific renderer prop envelope. The generic widget payload is the
 * untyped JSON node (`GenericWidget`); each renderer reads the props it needs
 * defensively so the kit stays domain-neutral.
 */
export type WidgetRendererProps<W extends WidgetRendererShape = GenericWidget> = Omit<
  SharedWidgetRendererProps<W & WidgetRendererShape>,
  'widget' | 'rect'
> & {
  readonly widget: W;
  readonly rect: WidgetRendererRect;
};

/**
 * React-bound renderer component. The shared contract keeps the return type
 * framework-neutral; this binding narrows it for JSX usage.
 */
export type WidgetRendererComponent<W extends WidgetRendererShape = GenericWidget> = (
  props: WidgetRendererProps<W>,
) => ReactElement | null;

export type { WidgetRendererEvent, WidgetRendererRect, WidgetRendererShape };
