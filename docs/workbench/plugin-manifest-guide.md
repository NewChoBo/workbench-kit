# Plugin Manifest Guide

This guide defines the baseline manifest shape for Workbench Kit plugin
experiments. It is a documentation layer over the current
`@workbench-kit/contracts` plugin types, not a commitment to marketplace,
signature, transport, or dependency-resolution behavior.

## Manifest Shape

```json
{
  "pluginId": "example.sample-plugin",
  "version": "1.0.0",
  "displayName": "Sample Plugin",
  "publisher": "example",
  "description": "Adds sample workbench commands.",
  "homepageUrl": "https://example.com/sample-plugin",
  "repositoryUrl": "https://example.com/sample-plugin.git",
  "contributions": {
    "commands": [
      {
        "id": "sample.refresh",
        "label": "Refresh Sample",
        "icon": "codicon-refresh"
      }
    ],
    "menus": [
      {
        "type": "command",
        "commandId": "sample.refresh",
        "surfaces": ["command", "workspace"]
      }
    ],
    "surfaces": ["command", "workspace"]
  }
}
```

## Descriptor Fields

These fields map to `PluginDescriptor`.

| Field           | Required | Contract field  | Notes                                      |
| --------------- | -------- | --------------- | ------------------------------------------ |
| `pluginId`      | Yes      | `pluginId`      | Stable package ID, preferably qualified.   |
| `version`       | Yes      | `version`       | Semver-compatible string.                  |
| `displayName`   | Yes      | `displayName`   | Human-readable label.                      |
| `publisher`     | Yes      | `publisher`     | Publisher or package namespace.            |
| `description`   | No       | `description`   | Product-neutral description.               |
| `homepageUrl`   | No       | `homepageUrl`   | Informational URL only.                    |
| `repositoryUrl` | No       | `repositoryUrl` | Informational URL only.                    |
| `contributions` | No       | `contributions` | Command/menu/settings/view metadata block. |

The baseline host service requires `pluginId`, `version`, and `displayName`
during install. Manifests should also include `publisher` so descriptor metadata
remains complete for future registry and trust UI.

## Source Fields

Manifest loading is host-owned. The loaded source maps to `PluginSource`.

| Source kind    | `ref` meaning                         | Expected owner                   |
| -------------- | ------------------------------------- | -------------------------------- |
| `local`        | Local path or host-local package ref  | Host application or test adapter |
| `url`          | Direct package URL                    | Host transport adapter           |
| `manifest-url` | URL to a manifest JSON representation | Host transport adapter           |

Workbench Kit contracts do not fetch URLs or read local files. The host adapter
resolves the source, validates the manifest, and passes descriptor data to the
plugin lifecycle service.

## Contribution Fields

Contribution metadata maps to `PluginContributions`.

| Manifest field                    | Contract target                                     | Baseline rule                                        |
| --------------------------------- | --------------------------------------------------- | ---------------------------------------------------- |
| `contributions.commands`          | `commandContributions.commands`                     | Defines command metadata only.                       |
| `contributions.menus`             | `commandContributions.menuEntries` or `menuEntries` | Projects commands into known surfaces.               |
| `contributions.settingsSections`  | `settingsSections`                                  | Metadata only; React settings rendering is separate. |
| `contributions.viewContributions` | `viewContributions`                                 | Metadata only; no direct component mutation.         |
| `contributions.surfaces`          | `surfaces`                                          | Optional grouping/filtering hint.                    |

Commands should not include business logic. They provide IDs, labels, icons,
visibility/enabled metadata, and optional danger/shortcut hints. Consumers or
host adapters own actual command handlers.

## Baseline Schema Rules

| Rule                 | Requirement                                                                    |
| -------------------- | ------------------------------------------------------------------------------ |
| Descriptor identity  | `pluginId`, `version`, and `displayName` must be non-empty strings.            |
| Contribution scope   | Initial scope is command, menu, view, and settings metadata only.              |
| Runtime side effects | No manifest field grants direct storage, network, or host access.              |
| Trust                | Installed plugins start with `trust: 'unknown'` unless host policy changes it. |
| Enablement           | Successful install starts enabled and in `installed` state.                    |
| Conflict policy      | Command ID conflicts follow the current command registry overlay policy.       |
| Unknown fields       | Hosts may preserve unknown metadata, but public components must ignore it.     |

## Validation Checklist

Before a host installs a manifest:

1. Parse JSON through a host-owned parser.
2. Verify descriptor identity fields are present and non-empty.
3. Normalize contribution arrays to empty arrays when absent.
4. Reject commands without an `id` or `label`.
5. Reject menu command entries without `commandId`.
6. Keep trust, permissions, and transport failures in host state.
7. Pass the validated descriptor/source to `PluginLifecycleService.install()`.

## Related Evidence

- `packages/contracts/src/plugin.ts` defines the current plugin descriptor,
  source, contribution, lifecycle, trust, and enablement contracts.
- `packages/contracts/src/plugin.test.ts` covers baseline contract helpers.
- [`plugin-lifecycle.md`](./plugin-lifecycle.md) documents install state,
  trust, enablement, and conflict baseline policies.
