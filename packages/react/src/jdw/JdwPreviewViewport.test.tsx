import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  JdwPreviewViewport,
  resolveContainerLayoutConstraints,
  resolveJdwPreviewFrameSize,
} from './JdwPreviewViewport.js';

const SAMPLE_JSON = JSON.stringify({
  type: 'column',
  args: {
    gap: 8,
    padding: 12,
    children: [{ type: 'text', args: { text: 'Hello preview' } }],
  },
});

describe('JdwPreviewViewport', () => {
  it('resolves a positive frame size for valid JDW', () => {
    const frame = resolveJdwPreviewFrameSize(SAMPLE_JSON);
    expect(frame.width).toBeGreaterThan(0);
    expect(frame.height).toBeGreaterThan(0);
  });

  it('maps host size to outside-in layout constraints', () => {
    expect(resolveContainerLayoutConstraints(640, 480)).toEqual({
      minWidth: 0,
      maxWidth: 640,
      minHeight: 0,
      maxHeight: 480,
    });
    expect(resolveContainerLayoutConstraints(100, 80, 8)).toEqual({
      minWidth: 0,
      maxWidth: 92,
      minHeight: 0,
      maxHeight: 72,
    });
  });

  it('renders a host shell that waits for container measurement', () => {
    const markup = renderToStaticMarkup(<JdwPreviewViewport json={SAMPLE_JSON} />);

    expect(markup).toContain('data-testid="jdw-preview-viewport-host"');
    expect(markup).toContain('data-fit="container"');
    // SSR/static markup has no ResizeObserver measurement yet.
    expect(markup).not.toContain('data-testid="jdw-preview-viewport"');
  });

  it('falls back to plain preview for invalid JSON', () => {
    const markup = renderToStaticMarkup(<JdwPreviewViewport json="{not-json" />);

    expect(markup).toContain('data-testid="jdw-preview-error"');
    expect(markup).not.toContain('data-testid="jdw-preview-viewport"');
  });
});
