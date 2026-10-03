import type { JSX } from 'react';

import { Button, CatalogBrowseCard, LibraryDetailLayout } from '@workbench-kit/react/primitives';

const sampleCover =
  'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/570/header.jpg';
const sampleBackground =
  'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/570/library_hero.jpg';

export function LibraryDetailLayoutDemo({
  mode = 'banner',
  showMedia = true,
  scrollMode = 'body',
}: {
  mode?: 'background' | 'banner' | 'hero-cover';
  scrollMode?: 'body' | 'all';
  showMedia?: boolean;
}): JSX.Element {
  return (
    <LibraryDetailLayout
      actions={
        <>
          <Button variant="primary">Play</Button>
          <Button secondary>Open Path</Button>
        </>
      }
      backgroundImageUrl={showMedia ? sampleBackground : null}
      coverAlt="Sample game"
      coverImageUrl={showMedia ? sampleCover : null}
      description="Short description excerpt for the selected library item."
      mode={mode}
      scrollMode={scrollMode}
      summary="Steam · Installed · 42h playtime"
      title="Sample Game"
    >
      <div>Metadata grid slot</div>
      {mode === 'hero-cover' ? (
        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            marginTop: 16,
          }}
        >
          <CatalogBrowseCard
            label="A selected poster with a longer catalog title"
            variant="poster"
            selected
            imageUrl={showMedia ? sampleCover : null}
          />
          <CatalogBrowseCard
            label="Compact catalog item"
            variant="compact"
            imageUrl={showMedia ? sampleCover : null}
          />
        </div>
      ) : null}
    </LibraryDetailLayout>
  );
}
