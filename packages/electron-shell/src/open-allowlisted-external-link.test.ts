import { describe, expect, it, vi } from 'vitest';

import {
  InvalidExternalLinkUrlError,
  openAllowlistedExternalLink,
  UnknownExternalLinkIdError,
} from './open-allowlisted-external-link.js';

describe('openAllowlistedExternalLink', () => {
  it('opens a known allowlisted https URL', async () => {
    const openExternal = vi.fn(async () => undefined);

    await openAllowlistedExternalLink({
      linkId: 'docs',
      allowlist: { docs: 'https://example.com/docs' },
      openExternal,
    });

    expect(openExternal).toHaveBeenCalledWith('https://example.com/docs');
  });

  it('rejects unknown and empty link ids', async () => {
    const openExternal = vi.fn(async () => undefined);

    await expect(
      openAllowlistedExternalLink({
        linkId: 'missing',
        allowlist: { docs: 'https://example.com/docs' },
        openExternal,
      }),
    ).rejects.toBeInstanceOf(UnknownExternalLinkIdError);

    await expect(
      openAllowlistedExternalLink({
        linkId: '   ',
        allowlist: { docs: 'https://example.com/docs' },
        openExternal,
      }),
    ).rejects.toBeInstanceOf(UnknownExternalLinkIdError);

    expect(openExternal).not.toHaveBeenCalled();
  });

  it('rejects invalid allowlisted URL values', async () => {
    const openExternal = vi.fn(async () => undefined);

    await expect(
      openAllowlistedExternalLink({
        linkId: 'bad',
        allowlist: { bad: 'not-a-url' },
        openExternal,
      }),
    ).rejects.toBeInstanceOf(InvalidExternalLinkUrlError);

    expect(openExternal).not.toHaveBeenCalled();
  });
});
