import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cssPath = join(dirname(fileURLToPath(import.meta.url)), 'chat-conversation.css');

describe('chat conversation bar CSS contract', () => {
  it('keeps a readable min-width floor for title and session pills', () => {
    const css = readFileSync(cssPath, 'utf8');

    expect(css).toMatch(
      /\.chat-conversation-bar__pill-wrap\s*\{[^}]*min-width:\s*7\.5rem/s,
    );
    expect(css).toMatch(/\.chat-conversation-bar__pill--session\s*\{[^}]*min-width:\s*5\.5rem/s);
  });
});
