import type {
  LibraryItemDescriptor,
  LibraryManifest,
  LibraryProvider,
} from '@newchobo-ui/contracts';
import { parseLibraryManifest, parseLibraryManifestText } from '@newchobo-ui/contracts';

type ManifestTextLoader = () => Promise<string> | string;

export interface LibraryManifestProviderOptions {
  displayName: string;
  id: string;
  loadManifestText: ManifestTextLoader;
}

export interface StaticLibraryManifestProviderOptions {
  displayName: string;
  id: string;
  manifestText: string;
}

export interface ObjectLibraryManifestProviderOptions {
  displayName: string;
  id: string;
  manifest: unknown;
}

export interface HttpLibraryManifestProviderOptions {
  displayName: string;
  id: string;
  manifestUrl: string;
  readText?: (url: string) => Promise<string>;
}

export function createLibraryManifestProvider({
  displayName,
  id,
  loadManifestText,
}: LibraryManifestProviderOptions): LibraryProvider {
  return {
    displayName,
    id,
    async listItems() {
      const manifest = parseLibraryManifestSourceText(id, await loadManifestText());
      return manifest.items.map((item) => normalizeLibraryItemProviderSource(item, id));
    },
  };
}

export function createStaticLibraryManifestProvider({
  displayName,
  id,
  manifestText,
}: StaticLibraryManifestProviderOptions): LibraryProvider {
  return createLibraryManifestProvider({
    displayName,
    id,
    loadManifestText: () => manifestText,
  });
}

export function createLibraryManifestObjectProvider({
  displayName,
  id,
  manifest,
}: ObjectLibraryManifestProviderOptions): LibraryProvider {
  return {
    displayName,
    id,
    async listItems() {
      const parsedManifest = parseLibraryManifestSourceData(id, manifest);
      return parsedManifest.items.map((item) => normalizeLibraryItemProviderSource(item, id));
    },
  };
}

export function createLibraryManifestUrlProvider({
  displayName,
  id,
  manifestUrl,
  readText,
}: HttpLibraryManifestProviderOptions): LibraryProvider {
  return createLibraryManifestProvider({
    displayName,
    id,
    loadManifestText: async () => {
      const loader = readText ?? defaultReadText;
      return loader(manifestUrl);
    },
  });
}

function parseLibraryManifestSourceText(
  providerId: string,
  rawManifestText: string,
): LibraryManifest {
  const manifest = parseLibraryManifestText(rawManifestText, `library-manifest:${providerId}`);

  return normalizeManifestSourceId(manifest, providerId);
}

function parseLibraryManifestSourceData(
  providerId: string,
  rawManifestData: unknown,
): LibraryManifest {
  const manifest = parseLibraryManifest(rawManifestData, `library-manifest:${providerId}`);

  return normalizeManifestSourceId(manifest, providerId);
}

function normalizeManifestSourceId(manifest: LibraryManifest, providerId: string): LibraryManifest {
  if (manifest.source.sourceId) {
    return manifest;
  }

  return {
    ...manifest,
    source: {
      ...manifest.source,
      sourceId: providerId,
    },
  };
}

function normalizeLibraryItemProviderSource(
  item: LibraryItemDescriptor,
  providerId: string,
): LibraryItemDescriptor {
  const source = {
    ...item.source,
    sourceId: item.source.sourceId ?? providerId,
  };

  return {
    ...item,
    providerId: item.providerId ?? providerId,
    source,
  };
}

async function defaultReadText(url: string): Promise<string> {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('fetch is not available in this environment');
  }

  const response = await globalThis.fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load library manifest from ${url}: ${response.status}`);
  }

  return response.text();
}
