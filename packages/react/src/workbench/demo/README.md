# Workbench Demo Helpers

This directory contains private workspace-only demo code for Storybook and local
integrated shell verification. It is intentionally excluded from the
`@workbench-kit/react` package files and has no public export path.

Use this directory for:

- `IntegratedShellDemo` host composition used by Storybook.
- Story fixtures and scenario orchestration.
- Demo runtime services that connect adapters, runtime, services, and platform
  commands for integrated checks.

Do not use this directory for:

- Public package imports.
- Product application entrypoints.
- Extension host or runtime contracts.
- Reusable workbench orchestration that belongs in
  `@workbench-kit/shell-react`, `@workbench-kit/workbench-core`, platform,
  adapters, or services packages.

When demo behavior becomes reusable, extract it to the appropriate package first,
then rewire the story or local demo to consume that public surface.
