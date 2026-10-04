# Monaco editor values

`WorkbenchMonacoEditor` keeps live editing text in Monaco. It reports changes through
`onChange` and reconciles a changed, committed `value` into the current model before
paint. The upstream React editor's passive value synchronization is disabled.
The editor is read-only during initialization until this synchronization is ready.
The adapter observes model identity changes, not individual content changes. A native
content event alone does not schedule adapter rendering or reconciliation. A parent's
committed value update still does. There is no second text buffer.

An identical current `value` on a rerender is not an explicit reset. A changed parent
value is authoritative, including a deliberate reset to text previously emitted by
`onChange`. There is no history-of-strings filter. Hosts that debounce or fetch
values asynchronously must cancel or sequence stale results: this string-only API
cannot distinguish an out-of-order result from an intentional external replacement.

External editable replacements retain an undo stop and suppress their own
`onChange` echo. Read-only replacements use Monaco's set-value behavior and emit
`onChange`, matching the upstream wrapper. Equal parent echoes do not rewrite the
model; distinct reentrant edits still reach the callback.

A failed editable write is not marked reconciled. Subsequent typing remains intact.
Neither typing, an identical prop rerender, nor a read-only toggle retries that write.
A later value, path, or model transition can retry reconciliation. Native typing,
undo/redo and composition stay within
Monaco's normal input path. A path change waits for the corresponding model before
applying its value. Model subscriptions are removed when the editor is disposed or
the component unmounts. This integration does not synchronously flush global React
work, patch Monaco internals, or disable suggestions.
