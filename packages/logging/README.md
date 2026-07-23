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
