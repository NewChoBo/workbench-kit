import { createElement, type CSSProperties, type ReactNode } from 'react';
import type { GenericWidget } from '@workbench-kit/json-widget';

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function textStyle(widget: GenericWidget): CSSProperties {
  return {
    color: typeof widget.color === 'string' ? widget.color : undefined,
    background: typeof widget.background === 'string' ? widget.background : undefined,
    fontSize: readNumber(widget.fontSize),
  };
}

export function renderBuiltinWidgetLeaf(widget: GenericWidget): ReactNode {
  if (widget.type === 'text') {
    return createElement(
      'span',
      {
        'data-widget-type': 'text',
        style: textStyle(widget),
      },
      String(widget.text ?? ''),
    );
  }

  return null;
}
