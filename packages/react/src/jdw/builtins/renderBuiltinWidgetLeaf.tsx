import { createElement, type CSSProperties, type ReactNode } from 'react';
import type { GenericWidget } from '@workbench-kit/jdw';

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function textStyle(widget: GenericWidget): CSSProperties {
  return {
    color: typeof widget.color === 'string' ? widget.color : undefined,
    background: typeof widget.background === 'string' ? widget.background : undefined,
    fontSize: readNumber(widget.fontSize),
  };
}

function sizeStyle(widget: GenericWidget): CSSProperties {
  return {
    width: readNumber(widget.width),
    height: readNumber(widget.height),
  };
}

function isAllowedStaticImageSource(value: string): boolean {
  if (value.startsWith('//')) return false;

  const schemeMatch = /^[A-Za-z][A-Za-z0-9+.-]*:/.exec(value);
  if (!schemeMatch) return true;

  const scheme = schemeMatch[0].slice(0, -1).toLowerCase();
  return scheme === 'http' || scheme === 'https' || scheme === 'workspace' || scheme === 'asset';
}

function imageStyle(widget: GenericWidget): CSSProperties {
  return {
    ...sizeStyle(widget),
    objectFit: readString(widget.fit) as CSSProperties['objectFit'],
    display: 'block',
    maxWidth: '100%',
    maxHeight: '100%',
  };
}

function iconName(widget: GenericWidget): string {
  const name = readString(widget.name);
  return name && /^[a-z0-9-]+$/i.test(name) ? name : 'symbol-misc';
}

function iconStyle(widget: GenericWidget): CSSProperties {
  return {
    color: readString(widget.color),
    fontSize: readNumber(widget.size),
    lineHeight: 1,
  };
}

function buttonStyle(widget: GenericWidget): CSSProperties {
  const variant = readString(widget.variant);
  return {
    color: readString(widget.color),
    background:
      readString(widget.background) ?? (variant === 'secondary' ? 'transparent' : undefined),
    border: variant === 'secondary' ? '1px solid currentColor' : undefined,
    borderRadius: 4,
    padding: '4px 10px',
    font: 'inherit',
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

  if (widget.type === 'image') {
    const src = readString(widget.src);
    if (!src || !isAllowedStaticImageSource(src)) {
      return createElement(
        'span',
        {
          'data-image-state': 'blocked',
          'data-widget-type': 'image',
          style: sizeStyle(widget),
        },
        readString(widget.alt) ?? 'Image',
      );
    }

    return createElement('img', {
      'data-widget-type': 'image',
      alt: readString(widget.alt) ?? '',
      src,
      style: imageStyle(widget),
    });
  }

  if (widget.type === 'icon') {
    return createElement('i', {
      'aria-hidden': true,
      'data-widget-type': 'icon',
      className: `codicon codicon-${iconName(widget)}`,
      style: iconStyle(widget),
    });
  }

  if (widget.type === 'button') {
    return createElement(
      'button',
      {
        'data-widget-type': 'button',
        disabled: widget.disabled === true,
        style: buttonStyle(widget),
        type: 'button',
      },
      readString(widget.label) ?? 'Button',
    );
  }

  return null;
}
