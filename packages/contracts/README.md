# `@workbench-kit/contracts`

Shared TypeScript contracts for chat, save, patch, library, launchpad mapping,
widget renderer, and plugin flows. Ships compiled `dist/` plus OpenAPI specs
under `openapi/`.

Published on npm with the **`prototype`** dist tag.

## Install

```powershell
pnpm add @workbench-kit/contracts@prototype
```

## Usage

```ts
import type { ChatTransport, WorkspacePatchApplier } from '@workbench-kit/contracts';
import { AbstractChatTransport, isDeltaEvent } from '@workbench-kit/contracts';
```

OpenAPI sources for host/backend alignment:

- [`openapi/`](./openapi/)

## Related docs

- [API Reference](../../docs/guides/api-reference.md)
- [Plugin Manifest Guide](../../docs/workbench/plugin-manifest-guide.md)
- [Sample Host Backend API](../../docs/workbench/sample-host-backend-api.md)
