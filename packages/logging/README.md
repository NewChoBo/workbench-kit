# `@workbench-kit/logging`

Small scoped logger for Workbench Kit packages and hosts.

```ts
import { createWorkbenchLogger, type WorkbenchLogSink } from '@workbench-kit/logging';

const telemetry: WorkbenchLogSink = {
  write(event) {
    // host telemetry / file transport
  },
};

const log = createWorkbenchLogger('host', {
  enabled: true,
  minLevel: 'info',
  sinks: [telemetry],
});

log.info('ready');
```

- Default console sink remains enabled (`consoleSink: false` to disable).
- Level filtering runs before sinks.
- Sink exceptions are isolated and never thrown to callers.

## Local Node file sink

```ts
import { createWorkbenchFileLogSink } from '@workbench-kit/logging/node';

const fileSink = createWorkbenchFileLogSink({ directory: absoluteHostLogDirectory });
const log = createWorkbenchLogger('runtime', {
  enabled: true,
  minLevel: 'info',
  consoleSink: false,
  sinks: [fileSink],
});
log.info('runtime.started', { version: '1.0.0' });
```

The focused `./node` export supports ESM, CommonJS and declarations. The root
entry stays browser-safe. The sink is not a sanitizer: hosts must select approved
fields before logging, and must not pass secrets, arbitrary errors or content.

Defaults are `workbench.jsonl`, 1 MiB per file, three files including the current
file, and 4096 UTF-8 bytes per JSONL record including its newline. Positive safe
integer limits can be configured. Rotation uses `.1`, `.2`, etc.; these names must
be reserved for a single sink/writer. Pre-existing files under those names are
rotated when within the configured limit, while unrelated files and older siblings outside the configured range
are not deleted. Shrinking the configured file count does not clean older logs. Any oversized
pre-existing current/reserved sibling makes writes fail closed with `oversize`: its
bytes and names are preserved, without deletion, truncation or rotation. Retention
bounds apply to accepted managed writes, not historical files already outside policy.

The host owns a trusted absolute directory and its ancestors. Traversal and
nonportable basenames, symlink/nonregular targets and multiply linked files are
rejected. Opening uses `O_NOFOLLOW` where supported, then verifies the descriptor
is regular. Directory/rotation name checks alone do not prevent hostile ancestor
replacement or all rename races. Platforms without effective no-follow support
have a check/open race; this is not a hostile-filesystem security boundary.
Concurrent processes writing the same names are unsupported.

Writes are synchronous and best effort: accepted bytes are not an fsync or
power-loss durability guarantee. There is no queue, flush API or shutdown veto.
Disk errors, OOM, forced termination, failure before hooks install and partial OS
writes may lose the final record or leave an incomplete final line. Serialization,
oversize, rotation and append failures invoke only the corresponding fixed
`onFailure` code; callback and sink failures cannot escape `write`. Neither raw
I/O error messages nor paths are passed to that callback. Avoid recursively
logging from it.

Export changes require the repository public-export and packaging gates plus
`node scripts/check-logging-node-consumer.mjs`; its isolated archived consumer
checks ESM/CommonJS, public types and browser bundling of the root entry.
