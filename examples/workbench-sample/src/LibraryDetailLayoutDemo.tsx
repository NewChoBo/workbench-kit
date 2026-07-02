import type { JSX } from 'react';

import { Button, LibraryDetailLayout } from '@workbench-kit/react/primitives';

const sampleCover =
  'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/570/header.jpg';
const sampleBackground =
  'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/570/library_hero.jpg';

export function LibraryDetailLayoutDemo({
  mode = 'banner',
  showMedia = true,
}: {
  mode?: 'background' | 'banner';
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
      summary="Steam · Installed · 42h playtime"
      title="Sample Game"
    >
      <div>Metadata grid slot</div>
    </LibraryDetailLayout>
  );
}
