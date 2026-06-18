import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChatRenameDialog } from './ChatRenameDialog';

describe('ChatRenameDialog', () => {
  it('renders rename form fields', () => {
    const markup = renderToStaticMarkup(
      <ChatRenameDialog
        conversation={{ id: 'chat-1', title: 'Planning' }}
        onCancel={() => undefined}
        onRename={() => undefined}
      />,
    );

    expect(markup).toContain('chat-rename-dialog');
    expect(markup).toContain('Rename chat');
    expect(markup).toContain('value="Planning"');
  });
});
