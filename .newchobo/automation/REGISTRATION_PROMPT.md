# Scheduled task registration prompt

Register or reconcile the task declared in `scheduled-task.json` as a heartbeat
that returns to the established control conversation. Do not register it as a
standalone local-project or Work task. Update an existing task only when its
automation ID is known or its name matches exactly once; otherwise stop with
`RECONCILIATION_REQUIRED` rather than creating a duplicate.

Each run must:

1. return to the registered Chat and use an isolated worktree for writes;
2. read `AGENTS.md` and `.newchobo/automation/CONSTITUTION.md` first;
3. freeze one control commit and load `registry.json`, `scheduled-task.json`, the
   role, protocols, and result schema from that same commit;
4. select at most one material item and follow the hourly protocol;
5. create at most one validated local commit and never push or mutate GitHub;
6. return a structured result and treat no eligible work as `NO_ACTION`;
7. stop with `CONTROL_CONTRACT_NOT_PUBLISHED` if the control plane is not present
   on the integration branch used to create the worktree.

Runtime task status and cadence belong to the Scheduled task manager. The
`observed` block in `scheduled-task.json` is only an audited snapshot and must be
updated explicitly after reconciliation.
