import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AppIcon } from './AppIcon';

describe('AppIcon', () => {
  it('renders a host image with accessible text and a stable size', () => {
    const markup = renderToStaticMarkup(
      <AppIcon alt="Example app" className="host-icon" size="lg" src="/app-icon.svg" />,
    );

    expect(markup).toContain('class="ui-app-icon host-icon"');
    expect(markup).toContain('data-size="lg"');
    expect(markup).toContain('alt="Example app"');
    expect(markup).toContain('src="/app-icon.svg"');
  });

  it('renders host-owned custom icon content without adding a fallback brand', () => {
    const markup = renderToStaticMarkup(
      <AppIcon aria-hidden>
        <svg data-testid="host-mark" />
      </AppIcon>,
    );

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('data-testid="host-mark"');
    expect(markup).not.toContain('<img');
  });
});
