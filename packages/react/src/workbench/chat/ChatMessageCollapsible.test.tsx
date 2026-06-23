import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ChatMessageCollapsible } from './ChatMessageCollapsible';

describe('ChatMessageCollapsible', () => {
  it('renders message text in the bubble body', () => {
    const markup = renderToStaticMarkup(
      <ChatMessageCollapsible content="Hello team" surfaceClassName="message__bubble">
        Hello team
      </ChatMessageCollapsible>,
    );

    expect(markup).toContain('Hello team');
    expect(markup).toContain('message__bubble-body');
    expect(markup).not.toContain('message__bubble-body--collapsed');
  });
});
