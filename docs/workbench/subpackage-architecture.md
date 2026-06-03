# Workbench Subpackage Architecture Design

## Purpose

The current `newchobo-ui-package` implementation has strong UI primitives and workspace
runtime behavior already, but file persistence and chat flow are still coupled to story-level
integration logic. This document defines a practical first-step architecture for **in-repo
subpackage extraction** before deciding to publish these packages separately.

## Single Large Goal and Stage Plan

### Big Goal

Build reusable, testable `contracts` and `services` subpackages that own save/chat/patch orchestration
so existing `react` workbench can keep UI behavior while separating domain logic for later publish.

### Stage Goal Decomposition

1. **Stage 0: Design Alignment and Scope Lock**
   - Freeze domain contracts and error/result model boundary.
   - Finalize in-repo packaging and migration sequencing.
   - Exit condition: design doc approved and migration risk points recorded in Decision Log.

2. **Stage 1: Contract Foundation**
   - Create contract-only package and publish compile-safe type contracts for file/chat/patch.
   - Exit condition: contracts can be imported by existing packages with no cycle.

3. **Stage 2: Domain Services**
   - Implement orchestration services for save/chat/patch with explicit result types.
   - Exit condition: unit tests cover conflict, stream state transitions, and apply ordering.

4. **Stage 3: Storybook Refactoring**
   - Move current story-level orchestration to service/adapters.
   - Exit condition: feature parity for baseline flows, and story code no longer owns core orchestration.

5. **Stage 4: Stability Hardening**
   - Add adapters, contract guards, and cleanup for subscriptions/error boundaries.
   - Exit condition: repeatable integration smoke test passes and no newly introduced regressions.
6. **Stage 5: Failure Hygiene**

- Make service failures explicit and isolated from unrelated event handlers.
- Exit condition: callback and transport failures do not corrupt service state or event delivery.

7. **Stage 6: Service Result Metadata**

- Propagate request metadata (`requestId`, `requestedAt`) across save/patch service results.
- Exit condition: every save/patch result includes observability metadata when created by services.
- Additional closeout condition: composed entrypoints (for example, `commit` → `saveDraft`) must preserve
  caller-issued metadata without regenerating request identity.

8. **Stage 7: Adapter Package Extraction**
   - Extract story-only adaptation logic into `@newchobo-ui/adapters` package.
   - Provide shared runtime transport + in-memory repository adapters.
   - Replace inline story helpers with package adapter usage.
   - Add adapter unit tests and include package in repository typecheck pipeline.
   - Exit condition: story runtime path flows through adapter APIs with unchanged behavior.

### Stage Dependencies and Delivery Order

- Stage 0 → Stage 1 → Stage 2 → Stage 3 → Stage 4 → Stage 5 → Stage 6 → Stage 7
- No later stage proceeds until previous stage exit criteria and validation gates are completed.

## Branch Execution Status (Current Branch: `feature/codex/next-target`)

- [x] Stage 0: Design alignment and scope lock.
- [x] Stage 1: Contract foundation.
- [x] Stage 2: Domain service bootstrap.
- [x] Stage 3: Story refactoring through adapters.
- [x] Stage 4: Stability hardening.
- [x] Stage 5: Failure-hygiene hardening.
- [x] Stage 6: Service result metadata propagation.
- [x] Stage 7: Adapter package extraction.

## Guiding Decision

- Build new subpackages inside the existing repository first.
- Keep contracts, runtime logic, and UI binding separate so they can move out later without major
  API churn.
- Prefer TypeScript interfaces and small abstract base classes for extension points.

This avoids premature packaging/ownership complexity while creating a stable boundary for future
extraction.

## Problems to Solve

1. Save behavior (`save`) is currently local UI state action + reducer action.
2. Chat send/cancel + streaming + status + workspace patches are orchestrated in story code.
3. Persistence, conflict policy, and transport details are mixed with component concerns.
4. Plugin-like extensions currently do not have a formal runtime I/O contract.

## Proposed Package Layout (In-Repo First)

```
packages/
  core/        (existing)     // command model, registry, menu projection
  workspace/   (existing)     // pure workspace model + reducer + utilities
  runtime/     (existing)     // event/message/workspace-patch contracts + mock runtime
  react/       (existing)     // UI composition and components
  contracts/   (new)          // cross-package interfaces + result types
  services/    (new)          // orchestration services for save/chat/patch flows
  adapters/    (new, optional) // mock/local adapters used by stories and tests
```

## New Package Responsibilities

### `@newchobo-ui/contracts`

- Pure types + contracts only; no UI or framework dependency.
- Define:
  - `WorkspaceFileRepository` contract (read/get/list/save/delete)
  - `ChatTransport` contract (send, cancel, subscribe)
  - `WorkspacePatchApplier` contract (apply patch)
  - Unified result/error model:
    - `SaveResult`, `SaveOutcome`, `SaveError`
    - `ChatStreamEvent`, `ChatSessionState`
    - `WorkspacePatchEvent` variants (`write-file`, `delete-file`)
  - Shared enums/string unions for lifecycle states and conflict categories
- Export abstract base classes where it reduces implementation boilerplate:
  - `AbstractWorkspaceFileRepository`
  - `AbstractChatTransport`
  - `AbstractPatchApplier`

### `@newchobo-ui/services`

- Uses contracts to assemble domain-safe orchestration.
- Define at least:
  - `WorkspaceSaveService`
    - `saveDraft`
    - `discardDraft`
    - `commit(path, content, metadata?)`
    - returns `SaveResult`
  - `WorkbenchChatService`
    - `sendMessage(message, context?)`
    - `cancel()`
    - emits normalized `ChatStreamEvent`
    - maps message stream events to patch hooks
  - `WorkspacePatchService`
    - validate + normalize + apply patch to workspace state/actions
- Keep side effects injected through contracts for testability.

### `@newchobo-ui/adapters` (optional, later)

- Concrete implementations:
  - `InMemoryWorkspaceFileRepository` for story/test use
  - `LocalStorageWorkspaceRepository` if required later
  - `MockChatTransport` for deterministic story and unit tests

## API Boundary Principles

1. **No UI concerns in contracts/services**
   - No React imports in contracts/services.
2. **No direct reducer dependence**
   - Components should call services and translate outcomes into reducer calls.
3. **Failure is explicit**
   - Result types are discriminated unions; avoid throwing for expected control flow.
4. **Single-write ownership**

- At most one module writes workspace files per command chain; services coordinate but do not mutate
  UI state directly.

5. **Runtime patch policy centralization**
   - Create/Update/Delete from chat runtime passes through `WorkspacePatchService`.

## Data Flow: Chat + Runtime Patch (Target)

1. User submits chat text in UI.
2. `WorkbenchChatService.sendMessage()` passes text to `ChatTransport`.
3. Transport emits stream events (`status`, `message`, `message-delta`, `workspace-patch`).
4. Chat service normalizes events and forwards to host callback.
5. `WorkspacePatchService` handles patch events with repository checks (exists/permissions/conflict).
6. Host applies resulting workspace action (existing reducer) if patch is approved.

## Data Flow: Save

1. Editor calls `WorkspaceSaveService.saveDraft(...)`.
2. Service loads current state from repository abstraction (if needed).
3. Conflicts are detected and categorized (`no-op`, `updated`, `stale`, `invalid-path`, etc.).
4. Service returns `SaveResult` explicitly.
5. UI displays status/toast/log and updates drafts only after success.

## In-Scope and Out-of-Scope

- In-scope:
  - Contract design + package bootstrapping
  - Chat event + save orchestration extracted from story logic
  - Deterministic adapter implementations for stories/tests
  - Type-safe result/error patterns
- Out-of-scope (later):
  - External npm publishing
  - MSW/REST transport migration
  - Full plugin marketplace lifecycle (install/update/rollback)

## Migration Phases

### Phase 1: Contract-First

- Add `packages/contracts` with interfaces and shared result types.
- Add tests for contracts and error/result typing behavior.
- **Goal decomposition**
  - 1.1: 계약 항목 우선순위 정립 (`저장`, `채팅`, `패치`, `충돌/에러 모델`)
  - 1.2: 패키지 스키마 및 export shape 정의
  - 1.3: contract-only 타입 테스트 + lint/컴파일 가드 추가

**Phase 1 Exit Criteria**

- `@newchobo-ui/contracts` 패키지 빌드/타입체크 통과
- 최소 1개 이상의 계약 검증 테스트 추가

### Phase 2: Service Bootstrap

- Add `packages/services` implementing `WorkspaceSaveService` and `WorkbenchChatService`.
- Unit test with mock repositories/transports.
- **Goal decomposition**
  - 2.1: `WorkspaceSaveService` 저장 파이프라인 구현 및 충돌/불변성 테스트
  - 2.2: `WorkbenchChatService` 메시지/취소/상태 전이 테스트
  - 2.3: `WorkspacePatchService` 패치 수신·적용·반환값 테스트

**Phase 2 Exit Criteria**

- 계약 기반 서비스가 UI 종속성 없이 단독 유닛 테스트 통과
- 저장 실패/성공 케이스를 `SaveResult`로 구분해 반환

### Phase 3: Story Adaptation

- Refactor `Workbench.stories.tsx` and `WorkspaceEditorPanel.stories.tsx` to consume services
  through adapters.
- Keep behavior equivalent; only implementation path changes.
- **Goal decomposition**
  - 3.1: 스토리 전용 adapter(입출력/패치) 추가
  - 3.2: `WorkspaceEditorPanel` 저장 경로를 서비스 결과 기반으로 전환
  - 3.3: `Workbench` 스토리의 런타임 patch 흐름을 서비스 경유로 전환

**Phase 3 Exit Criteria**

- 기존 베이스라인 스토리 1차 시나리오가 동일 결과로 동작
- 스토리 코드에서 reducer 직접 호출 의존이 줄어든 것 가시적 확인

### Phase 4: Integration Tightening

- Optional `packages/adapters` for mock and in-memory usage.
- Add contract-versioned snapshots or simple compatibility checks in `react` package.
- **Goal decomposition**
  - 4.1: 스토리/테스트용 어댑터 정리(`in-memory`, `mock transport`)
  - 4.2: `react` 패키지에서 contract compatibility guard 테스트 추가
  - 4.3: 릴리즈 전 위험요소(리스너 해제, 중복 구독) 스모크 점검

**Phase 4 Exit Criteria**

- 최소 1개 이상의 adapter를 통해 서비스 교체 테스트가 작동
- 주요 경계에서 불필요한 side effect가 없는지 문서화 + 회귀 테스트 등록

### Phase 5: Failure Hygiene

- Isolate service callbacks from callback failure and keep event delivery deterministic.
- Add hardening around state transitions and callback fan-out.
- Ensure transport failure and callback failure transitions are explicit and test-covered.

**Phase 5 Exit Criteria**

- `WorkbenchChatService` status transitions cover explicit lifecycle states (`idle`, `running`,
  `cancelled`, `error`).
- Patch listeners and `onPatch` callbacks are exception-safe.
- Service failure modes are verified by unit tests and do not degrade integration flow integrity.

## Next Cycle: Plugin Lifecycle Baseline

**목표:** 설치/활성화/비활성화/업데이트의 핵심 계약을 먼저 확정하고, 이후 서비스/스토리로 확대.

### Todo (우선순위)

- [x] 1순위: `@newchobo-ui/contracts` plugin lifecycle 타입 골격 추가
  - 대상: `PluginDescriptor`, `PluginSource`, `InstalledPlugin`, `PluginLifecycleResult`,
    `PluginLifecycleService` 인터페이스
  - 근거: `docs/workbench/plugin-lifecycle.md`의 M1 범위 정렬
- [x] 1순위: plugin 계약 유닛 테스트 추가
  - 대상: 성공/실패 판별 헬퍼, 상태 판별 규칙
  - 근거: contracts 패키지 변경은 타입 실패를 조기에 잡아야 함
- [ ] 2순위: plugin install command/menu/menu-입력 충돌 정책 문서 확정
  - 대상: `pluginId` 중복, command 충돌 정책, trust/enable/default 정책
  - 근거: 서비스 구현 전에 정책 고정
- [ ] 2순위: `migration-todo.md`에 단계별 acceptance criteria 반영
  - 대상: plugin 기여 범위, 기본/확장 scope, 테스트 후보
- [ ] 3순위: services에서 `PluginLifecycleService` 초기 구현(옵션)
  - 대상: 설치/삭제/활성화/업데이트 파이프라인, 요청 메타데이터 규약 준수
  - 근거: 저장/채팅/패치와 동일한 결과형태 계약 일관성 확보

### 검증 계획 (이 사이클)

- `pnpm --filter @newchobo-ui/contracts test` 통과
- `pnpm --filter @newchobo-ui/contracts typecheck` 통과
- 문서 상태 반영: `subpackage-architecture.md`, `migration-todo.md`, `docs/workbench/plugin-lifecycle.md`

## Validation Plan

### Test Strategy

- Unit (기능 정확성)
  - contracts: 판별 합집합 타입/결과 모델의 경계 케이스
  - services: 저장 충돌, stale 상태, 채팅 cancel/state 전이, patch 적용 순서
- Integration (경로 일관성)
  - react 컴포넌트/스토리: 기존 동작 대비 동일 결과 및 accessibility 동작 유지
  - story adapter에서 런타임 patch가 reducer로 직접 연결되는 대신 patch service 거쳐 적용되는지 검증
- Storybook Play (행위 검증)
  - baseline 플로우 5건 이상을 필수 태그로 유지(`test:storybook-play:required`)

### Acceptance Gates

- 로컬 기본 게이트
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm format:check`
- 통합 게이트
  - `pnpm test:storybook-play:required`
  - `pnpm build:storybook`

### Quality Metrics

- 저장 결과 반환의 명시성: 모든 save 호출은 `SaveResult`를 통해 success/failure 판정
- 패치 누락률: story 기준 `workspace-patch` 이벤트가 service를 우회하지 않음
- 상태 전이 무결성: 채팅 cancel 직후 stream이 남은 chunk를 추가 렌더링하지 않음
- 회귀 리스크: baseline playwright interaction 플로우 실패율 0%
- 성능/안정성: 구독 해제 누락과 duplicate listener 증가 방지 검증

### Exit Conditions (전체)

- Phase 1~5의 exit criteria 충족
- 기존 사용자 동작 기준(Workspace/Chat 기본 플로우) 회귀 없음
- 문서(설계/결정기록)가 코드 변경과 동기화되어 업데이트됨

## Branch Completion for This Cycle

- Objective status: complete.
- Documentation and implementation are now aligned for stages 0~5 in this branch.
- Next branch objective candidates:
  - plugin installation lifecycle design (install/update/enable/disable),
  - editor/session persistence adapter extraction,
  - contract versioning strategy for cross-package compatibility.

### Stage 4 Hardening Progress (2026-06-03)

- Completed listener lifecycle hardening in `WorkbenchChatService`:
  - disposal becomes idempotent,
  - disposed services ignore transport callbacks and subscriptions,
  - transport send after dispose is a no-op,
  - transport errors set chat snapshot status to `error`.
- Added shared path normalization in `@newchobo-ui/services`:
  - common `normalizeServiceWorkspacePath` helper,
  - `WorkspaceSaveService` and `WorkspacePatchService` now share normalization logic,
  - patch results return normalized `patch.path` for host actions.
- Added focused unit tests for path normalization and lifecycle edge cases.

### Stage 5 Reliability Progress (2026-06-03)

- Completed `WorkbenchChatService` callback and status hardening:
  - `sendMessage()` sets status to `running` before transport send.
  - `onPatch` callback exceptions are isolated and set snapshot status to `error`.
  - Listener callback exceptions are isolated; a failing listener does not prevent others from
    receiving events.
  - Error status transitions are deterministic on transport failures.
- Added explicit regression coverage:
  - status transition to `running`,
  - `onPatch` failure isolation,
  - listener failure isolation.
- Evidence:
  - `6a1bf6b`: harden workspace save and chat services foundation.
  - `d6ff767`: lifecycle/error isolation hardening in chat service.
  - `pnpm exec vitest run packages/services/src` passes.
  - `pnpm --filter @newchobo-ui/services typecheck` passes.

### Stage 6 Result-Metadata Progress (2026-06-03)

- Added shared result-envelope foundation for request metadata in `@newchobo-ui/contracts`.
- Updated service result types to consistently expose optional metadata (`requestId`, `requestedAt`).
- Implemented service-side metadata injection with deterministic-friendly request id factory support.
- Added integration test coverage to verify metadata presence in patch/save flow paths.
- Hardened composite save entrypoint behavior: `WorkspaceSaveService.commit()` reuses the same request
  metadata as the delegated save flow to avoid request id fragmentation.
- Evidence:
  - `fdcb5c7`: standardize contract failure model and flow tests.
  - `40340fc`: add request metadata to save/patch results.
  - `packages/services/src/save.test.ts`: commit path now asserts metadata preservation and single request-id emission.
  - `pnpm exec vitest run packages/contracts/src packages/services/src` passes.
  - `pnpm --filter @newchobo-ui/contracts typecheck` passes.

### Stage 7 Adapter Package Progress (2026-06-03)

- Added `packages/adapters` package with:
  - `workspace.ts` adapter (`InMemoryWorkspaceFileRepository`, `createWorkspaceFileRepository`)
  - `runtime.ts` adapter (`createChatTransportFromRuntime`, `emitRuntimeWorkspacePatch`)
  - root `index.ts` and package `exports`.
- Updated story integration to consume adapters:
  - workspace repository now comes from `createWorkspaceFileRepository` in adapters.
  - chat transport conversion now comes from `createChatTransportFromRuntime`.
- Added adapter unit tests:
  - `packages/adapters/src/workspace.test.ts`
  - `packages/adapters/src/runtime.test.ts`
- Wiring updates:
  - `@newchobo-ui/react` depends on `@newchobo-ui/adapters`.
  - root `typecheck` includes adapters package.
- Acceptance targets:
  - `pnpm --filter @newchobo-ui/adapters typecheck` passes.
  - `pnpm --filter @newchobo-ui/adapters test` passes.
  - `pnpm --filter @newchobo-ui/react typecheck` continues passing with adapter-based story wiring.
  - Verified 2026-06-03: adapter typecheck and adapter tests pass; react typecheck remains green.

## Acceptance Criteria

- A save action can be executed entirely through `@newchobo-ui/services` with explicit success/failure
  result.
- A chat patch event reaches a dedicated patch service before reducer mutation.
- Story-level integration no longer owns patch application logic directly.
- Existing UI behavior remains unchanged for users when using current story adapters.

## Risks

- Over-abstracting too early can slow iteration.
- Abstract base class misuse may reduce flexibility if dependencies are too rigid.
- Additional package boundaries may increase import verbosity in `react` package.

Mitigation: iterate in small increments, keep contracts minimal first, and remove/merge abstractions
that do not produce tests or usage value.

## Decision Log

| Date       | Decision                                        | Rationale                                                               | Status   |
| ---------- | ----------------------------------------------- | ----------------------------------------------------------------------- | -------- |
| 2026-06-03 | Use in-repo subpackages first                   | Faster validation with lower operational overhead                       | Approved |
| 2026-06-03 | Start with contracts + services                 | Align domain separation before external publishing                      | Approved |
| 2026-06-03 | Add optional adapters package in phase 3        | Keeps story/test dependencies isolated                                  | Approved |
| 2026-06-03 | Continue Stage 5 hardening inside services      | Keep callback failures from crashing event fan-out                      | Approved |
| 2026-06-03 | Start Stage 6 service-result metadata hardening | Standardize request-id/request-time propagation for save/patch services | Approved |
| 2026-06-03 | Start Stage 7 adapter extraction                | Move story/runtime adaptation to reusable package boundaries            | Approved |
