import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ChatMessageDateDivider } from './ChatMessageDateDivider';

describe('ChatMessageDateDivider', () => {
  it('renders a labeled separator for valid timestamps', () => {
    const markup = renderToStaticMarkup(
      <ChatMessageDateDivider timestamp="2026-06-18T14:30:00.000Z" />,
    );

    expect(markup).toContain('message-date-divider');
    expect(markup).toContain('role="separator"');
    expect(markup).toContain('<time');
  });
});
