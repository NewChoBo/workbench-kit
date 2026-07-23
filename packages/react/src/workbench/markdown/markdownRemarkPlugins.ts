import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

/** Shared remark plugins for workbench markdown surfaces (preview, chat, etc.). */
export const workbenchMarkdownRemarkPlugins = [remarkGfm];

/**
 * Default rehype pipeline for untrusted markdown (chat / preview).
 * Strips script/event handlers and dangerous URLs via rehype-sanitize.
 * Hosts that need raw HTML must render outside these kit surfaces.
 */
export const workbenchMarkdownRehypePlugins = [rehypeSanitize];
