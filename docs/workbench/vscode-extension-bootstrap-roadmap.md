# VS Code Extension Bootstrap Plan (v1)

> Current work priority update (2026-06-03): this document is preserved as the extension packaging plan.
> Immediate milestone priority is standalone application launch and runtime stabilization using existing
> `@workbench-kit/react` + `@workbench-kit/services` + `@workbench-kit/vscode-host` path.

## 요약 결론

- Workbench UI는 이미 구현되어 있다.
  - `packages/react/src/workbench/*`에 컴포넌트·훅·타입이 존재하고,
  - `packages/react/src/workbench/Workbench.stories.tsx`에서 통합 shell/탐색기/검색/채팅/에디터/설정 흐름이 동작한다.
  - 현재 즉시 과제는 `@workbench-kit/vscode-extension`를 완성하는 것이 아니라, Storybook 기반으로 검증된 UI를 standalone application 런치/기동 경로로 안정화하는 것이다.

> **실행 결정(2026-06-03):**  
> `@workbench-kit/vscode-extension` 관련 작업은 현재 주차에서는 보류하고, Standalone 런치 경로 안정화만을 이번 목표로 수행한다.
> extension 브랜치는 별도 2차 마일스톤에서 `Track A`(vscode-extension bootstrap API)로 재개한다.

근거:

- UI 바인딩: `packages/react/src/workbench/*`
- 통합 Story(셸/메뉴/명령/채널): `packages/react/src/workbench/Workbench.stories.tsx`
- 런타임 브릿지: `packages/vscode-host/src/runtime.ts`
- 핵심 오케스트레이션: `packages/services/src/{chat,patch,save}.ts`
- 어댑터(테스트/fixture): `packages/adapters/src/{runtime,workspace}.ts`

## 근거 기반 판정 (현재 상태)

- **판정: UI는 이미 구현되어 있으며 동작 기준이 존재한다.**
  - 통합 Story가 Workbench 핵심 동작을 구성한다.
  - host/서비스/트랜스포트 라우팅이 테스트로 일부 검증되어 있다.
- **현재 우선순위:** UI 재개발은 불필요하며, `bootstrap/orchestration` 중에서 `standalone` 실행 경로의 안정화를 우선한다.
- **근거 매핑:**
  - `packages/react/src/workbench/Workbench.stories.tsx`
  - `packages/vscode-host/src/{bridge,runtime}.ts`
  - `packages/services/src/{chat,patch,save}.ts`
  - `packages/vscode-extension/src/index.test.ts`
- **실행 게이트 검증 상태(최근):**
  - `pnpm --filter @workbench-kit/vscode-extension test` 통과
  - `pnpm --filter @workbench-kit/vscode-extension typecheck` 통과

## 심층 분석 정리: 왜 분할 개발이 맞는가

현재 구조의 분할 개발 적합성은 아래 표로 정리된다.

| 항목               | 현재 근거                                                                                              | 남은 문제                                                         | 분할 시 영향                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI 계층            | `@workbench-kit/react`에서 컴포넌트, 훅, 커맨드 프리셋이 정리됨. 통합 동작은 story 내 구성으로 검증됨. | Story 전용 조립 코드(상태와 서비스 결합)가 남아 있음.             | `@workbench-kit/react`는 순수 UI 라이브러리로 유지, standalone 런치에서는 현재 조립 코드를 점진적으로 안정화.                                        |
| 런타임 조립        | `@workbench-kit/vscode-host` + `@workbench-kit/services`로 메시지 라우팅/오케스트레이션이 가능.        | 조립 API 호출자(앱)가 일관된 production 진입점으로 정리되지 않음. | standalone 우선은 `Workbench` baseline 런치 경로를 선행 안정화하고, `@workbench-kit/vscode-extension`은 다음 마일스톤에서 추가 단일 진입점으로 처리. |
| 테스트 정합성      | storybook 인터랙션 + 패키지 단위 테스트에서 핵심 흐름이 커버됨.                                        | "story wiring"이 조립 동작의 일부를 대체.                         | baseline 동작은 유지하면서 최소 1개 시나리오를 host 조립경로로 확장.                                                                                 |
| 확장성(예: plugin) | 계약/호스트 서비스는 존재.                                                                             | bootstrap 옵션에서 lifecycle 바인딩이 아직 미완.                  | feature lane로 분리해 plugin 도입 리스크 격리.                                                                                                       |

## 의사결정 기준(예상 우선순위)

- 우선 결정할 것:
  - Track A를 extension bootstrap으로 먼저 닫을지, Track B를 standalone runtime 안정성 보강으로 먼저 할지.
- 권장:
  1. 현재는 Track B(standalone 런치 정합성) 우선.
  2. Track A(`vscode-extension` API 정합성)는 다음 마일스톤에서 재개.
  3. Track C는 문서/정책 준비만 선행하고 실행은 뒤로 이동.
- 기준:
  - standalone 런치 경로에서 핵심 동작(Explorer/Search/Editor/Chat)이 회귀 없이 동작해야 함.
  - 기존 story 시나리오 회귀가 깨지지 않아야 함.
  - merge는 `staging` 기반으로 milestone 기록.

## 제안 아키텍처(현재 코드 기준)

현재 경계는 아래처럼 잘 맞는다.

- `@workbench-kit/react`
  - UI 렌더링 전용(컴포넌트 + 훅 + 타입)
- `@workbench-kit/services`
  - save/chat/patch 오케스트레이션
- `@workbench-kit/contracts`
  - 타입/결과/이벤트 계약
- `@workbench-kit/adapters`
  - `Mock`/in-memory 어댑터
- `@workbench-kit/vscode-host`
  - 메시지 브릿지 + host 런타임 라우팅
- 추가 예정(확장 단계): `@workbench-kit/vscode-extension`
  - 현재는 `@workbench-kit/react` + `@workbench-kit/services` + `@workbench-kit/vscode-host` 런치 경로 안정화가 선행되어야 함.
  - 이후 패키지 확장 단계에서 위 경계를 조립해 앱 진입점 API를 제공.

## 목표-근거-검증 매핑(실행 체크리스트)

목표를 바로 실행 가능한 티켓으로 옮기기 위한 최소 증빙입니다.

| 목표                                  | 현재 상태              | 근거(코드/테스트)                                                                                                            | 다음 액션                                        |
| ------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Workbench UI가 이미 구현됨을 확인     | 완료                   | `packages/react/src/workbench/Workbench.stories.tsx` (IntegratedShell, chat, explorer, search, editor, settings 상태바 동작) | 유지: Story 기준 회귀 라인 보호                  |
| `vscode-extension` bootstrap 조립 API | 보류                   | `packages/vscode-extension/src/index.ts`, `packages/vscode-extension/src/index.test.ts`, 타입체크/테스트 통과                | 다음 마일스톤에서 재개                           |
| story의 standalone 런치 동등성 확보   | 진행 중                | `pnpm test:storybook-play:required`에서 baseline 태그 지정 및 결과 추적                                                      | Track B: 1개 핵심 플로우 baseline 안정화         |
| plugin 설치/라이프사이클 통합         | 설계 단계              | `packages/contracts/src/plugin.ts`, `docs/workbench/plugin-lifecycle.md`, host plugin service                                | Track C: 정책/옵션 스키마 문서 + 최소 API 스케치 |
| staging 기반 마일스톤 정리            | 미완료(문서 기준 진행) | `docs/conventions/git-workflow.md`                                                                                           | 브랜치 분리 후 `staging` 통합 + 마일스톤 커밋    |

## 이번 사이클 실행 플랜(우선순위)

### 1회차: Track B (standalone baseline) 안정화 완료 (실행 우선)

1. `packages/vscode-host/src/runtime.ts`와 `packages/vscode-host/src/bridge.ts`
   - Message bridge/host runtime에서 listener 정리, 에러 격리 동작을 standalone 기준으로 다시 검증
2. `packages/react/src/workbench/Workbench.stories.tsx`
   - baseline 시나리오(Explorer/Search/Editor/Chat)에서 앱 기동 경로가 안정적으로 렌더·상태 전환하는지 회귀 체크
3. `packages/workspace`/`packages/services` 경계에서 예외/해제(`dispose`) 동작이 story 동작을 깨지지 않게 유지되는지 테스트 추가
4. 검증 게이트
   - `pnpm test:storybook-play:required`
   - `pnpm --filter @workbench-kit/react typecheck`
   - `pnpm --filter @workbench-kit/vscode-host typecheck`

### 2회차: Track A (extension bootstrap)로 일부 전환

- **이 트랙은 현재 사이클의 실행 범위 밖**이다. `vscode-extension` 작업은 별도 마일스톤으로 이동시켜 아래 조건 충족 시 재개한다.
  - Standalone baseline 회귀 게이트가 모두 통과됨
  - host runtime/서비스 경계에서 운영 로그 및 에러 격리 정책이 안정화됨
  - 별도 작업 브랜치(`feature/codex/vscode-extension-bootstrap-deferred`)에서 작업 범위 재확정

1. `packages/vscode-extension/src/index.ts`로 최소 조합 API 정합성 재확인
2. `packages/react/src/workbench/Workbench.stories.tsx`에서 통합 플로우 1개를 `@workbench-kit/vscode-extension` 경로로 전환(옵션)
3. `migration-todo.md`에 extension 전환 조건/제약을 기록
4. 검증
   - `pnpm --filter @workbench-kit/vscode-extension test`
   - `pnpm --filter @workbench-kit/vscode-extension typecheck`

### 3회차: Track C 설계 정리

1. `docs/workbench/plugin-lifecycle.md`
   - install/enable/disable/update 정책(기본/확장)과 충돌 규칙 정리
2. `migration-todo.md`
   - 다음 마일스톤 acceptance criteria 추가
3. `packages/vscode-host` + `packages/contracts`
   - plugin 옵션 바인딩 계약으로 노출하기 위한 후보 인터페이스 초안만 문서화

## 공통 목표 (Goal)

1. Workbench UI를 다시 구현하지 않고, `@workbench-kit/vscode-extension`에서 바로 조합 가능한 실행 단위로 노출.
2. 현재 story 기반 사용법을 패키지 조립 API 사용법으로 점진 전환.
3. 추후 `tilepaper` 등 외부 앱이 동일 API로 전환 가능하도록 안정적인 런타임 인터페이스 제공.

## 단계별 계획

### Stage 0: 트랙 분리 및 범위 고정

- `vscode-extension` 패키지 트랙은 다음 마일스톤용으로 분리:
  - `feature/codex/vscode-extension-bootstrap-deferred`
  - `feature/codex/vscode-extension-story-integration-deferred`
  - `feature/codex/vscode-extension-plugin-runtime`
- 의존성/호환성 위협 포인트를 문서에 먼저 정리:
  - 메시지 타입(`workbench/chat/send`, `workbench/patch/apply`, `workbench/save/commit`)
  - 서비스 메타데이터(requestId/requestedAt) 전달
  - plugin lifecycle 충돌 정책

출구 조건:

- 대상 트랙별 작업 범위 승인
- `staging` 병합 정책(merge/no-ff 판단) 정합성 결정

### Stage 1: 패키지 스캐폴드

구성 파일:

- `packages/vscode-extension/package.json`
- `packages/vscode-extension/tsconfig.json`
- `packages/vscode-extension/src/index.ts`

공개 API 초안:

- `createWorkbenchExtensionRuntime(...)`
- `createWorkbenchServices(...)`
- `WorkbenchExtensionConfig`
- `WorkbenchExtensionRuntime`

출구 조건:

- `pnpm --filter @workbench-kit/vscode-extension typecheck` 성공
- 최소 단위 타입 단언 테스트(예시:
  `WorkspaceChatServiceOptions`/`WorkspaceSaveServiceOptions` 전달 타입이 조립 API와 일치)

### Stage 2: 런타임 조립 API 구현

핵심 조립 로직:

- `transport` 생성(기본값: `createWindowMessageTransport`)
- `WorkbenchChatService` / `WorkspacePatchService` / `WorkspaceSaveService` 인스턴스화
- `WorkbenchHostRuntime` 생성 및 공개
- 커맨드 레지스트리 주입 규칙 정리(기본 context factory)

의무 테스트:

- chat send → runtime 이벤트 발생 라우팅
- patch apply 메시지 라우팅
- save commit 메시지 라우팅

출구 조건:

- 위 테스트 3개 통과
- dispose에서 리스너/메시지 라우팅 안정적으로 정리

### Stage 3: Storybook 통합 경로 전환

- 기존 `Workbench.stories.tsx` 조립 코드를 `@workbench-kit/vscode-extension` API로 교체
- 동작 동일성 검증:
  - baseline play flow(Explorer/Search/Editor/Chat) 1:1 재현

출구 조건:

- 기존 동작을 깨지 않는 통합 동작
- `pnpm test:storybook-play:required` 통과(필수 태그는 기존 문서 기준 유지/갱신)

### Stage 4: 플러그인 바인딩 준비(후속)

- plugin contracts를 extension bootstrap 옵션으로 노출:
  - 설치/삭제/활성화/업데이트 서비스 주입 포인트
  - command/menu contributions 병합 정책
- 추후 `plugin-lifecycle` 패스와 연결

출구 조건:

- 초기 샘플로 install/enable 플로우 조립 API를 통과시키는 테스트

## API 권장 시그니처(1차)

```ts
// packages/vscode-extension/src/index.ts (예시)
export interface WorkbenchExtensionRuntimeOptions<TContext = void> {
  transport?: HostTransport;
  commandRegistry: CommandRegistry<TContext>;
  contextFactory?: () => TContext;
  repository: WorkspaceFileRepository;
  runtime?: MockWorkbenchRuntime;
  chatTransport?: ChatTransport;
  onPatch?: (patch: WorkspacePatchEvent) => Promise<unknown> | unknown;
  onSaveResult?: (result: SaveResult) => void;
}

export interface WorkbenchExtensionRuntime<TContext = void> {
  dispose(): void;
  messageBridge: MessageBridge;
  chatService: WorkbenchChatService;
  patchService: WorkspacePatchService;
  saveService: WorkspaceSaveService;
}

export function createWorkbenchExtensionRuntime<TContext = void>(
  options: WorkbenchExtensionRuntimeOptions<TContext>,
): WorkbenchExtensionRuntime<TContext>;
```

## 검증 게이트

현재 목표 기준 최소 게이트:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:storybook-play:required`

트랙별 추가 게이트:

- Stage1: `pnpm --filter @workbench-kit/vscode-extension typecheck`
- Stage2/3: `pnpm --filter @workbench-kit/vscode-extension test`, `pnpm --filter @workbench-kit/react typecheck`

## 리스크/완화

- 리스크: 런타임 조립 API가 `react` 내부 스토리 의존을 전면 감춤
  - 완화: 스토리에서는 API 사용량을 최소한의 범위로 점진 전환
- 리스크: `HostTransport`가 브라우저 전용 제약 강함
  - 완화: transport 팩토리를 주입 가능하게 설계해 테스트 더블 사용
- 리스크: plugin lifecycle 정책 선결정 오류
  - 완화: 1차는 `last-write-wins`로 고정, hard-fail 정책은 별도 milestone

## 다음 실행 목표(한 번에)

1. `feature/codex/standalone-app-bootstrap` 브랜치에서 `Workbench` standalone 런치 baseline(작동 shell) 정합성 강화
2. 서비스/host 경로에서 예외 처리와 dispose 정리를 회귀 테스트로 고정
3. Storybook baseline 동작(Explorer/Search/Editor/Chat) 기동 게이트 안정화
4. `@workbench-kit/vscode-extension` 패키지는 `feature/codex/vscode-extension-bootstrap-deferred`로 이후 마일스톤에서 재개

## 우선순위 전환 결정(2026-06-03 기준 권장)

- **요지**: Workbench UI는 이미 동작합니다. 새로 구현할 대상은 UI가 아니라 **bootstrap/orchestration 계층**입니다.
- 이유 근거:
  - `packages/react/src/workbench/Workbench.stories.tsx`에서 Activity Bar/Explorer/Search/Chat/Editor/Settings/Status 동작이 통합 시나리오로 동작하고 있으며,
  - 런타임/호스트/서비스 테스트도 존재해 기본 이벤트-패치-저장 흐름을 검증할 수 있습니다.
- 다음은 현재 우선순위:
  - **Track B (필수):** standalone baseline 런치 정합성 강화(기동/상태전이/에러격리)
  - **Track A (차기):** `@workbench-kit/vscode-extension` API 안정화 및 공개 타입 정합성 고정
  - **Track C (준비):** plugin lifecycle 옵션 노출 초안 작성(실서비스 이전)

### Track A 다음 마일스톤 목표(권장)

1. `WorkbenchExtensionRuntimeOptions`에 최소한의 안정적 필수값을 문서화하고, 커스텀 서비스 팩토리(`createChatService`, `createPatchService`, `createSaveService`)는 `host override` 관점으로 고정.
2. `WorkbenchExtensionRuntime` 반환값에 `dispose`, `messageBridge`, `runtime`, `services` 구조 유지.
3. 입력 정규화 규칙(경로/컨텍스트)과 예외 분리 동작을 문서화.
4. 게이트: `pnpm --filter @workbench-kit/vscode-extension typecheck`, `pnpm --filter @workbench-kit/vscode-extension test`.

### Track B(현재) 다음 마일스톤 목표(권장)

1. `Workbench.stories.tsx`의 `IntegratedShell`(또는 동일 핵심 시나리오) 1개를 standalone 런치 경로로 검증하고, 조립 단계를 최소 변경으로 고정.
2. 기존 동작과 최소 1:1 검증:
   - 상태 전이 라벨/상태 바 업데이트
   - Explorer 생성/삭제/저장/컨텍스트 동작
   - Chat send → patch apply → 파일 반영
3. 게이트: `pnpm test:storybook-play:required` + 대상 story baseline 플레이블록 결과.

### Track C 준비 작업(병행, 블로킹 아님)

1. plugin install/enable/disable 정책을 `last-write-wins`(기본) / hard-fail 정책 후보로 정리.
2. `packages/contracts`의 `Plugin*` 타입을 bootstrap 옵션 스키마로 소비할 수 있게 매핑 문서 작성.
3. `docs/workbench/plugin-lifecycle.md`와 `migration-todo.md`에 1단계 acceptance criteria 추가.

## 브랜치 실행 제안(요청 반영)

- 별도 브랜치 작업이 맞습니다. 현재 규칙 기준 권장 형식:
  - `feature/codex/standalone-app-bootstrap`
  - `feature/codex/vscode-extension-bootstrap-deferred`
  - `feature/codex/plugin-lifecycle-foundation`
- 목표가 단일 주제면 `--ff-only` 또는 logical commit.
- Track A/B 결과를 동시에 `staging`에 모을 때는:
  1. 각 feature 브랜치 merge into `staging`
  2. 통합 검증
  3. `staging` → `main`은 `--no-ff`(마일스톤 기록용)로 진행

## 깊은 분석 기반 멀티트랙 계획 (권장)

### 전제

현재 코드 기준에서 `react` 패키지는 UI 계층으로 충분히 성숙했고, 새로 필요한 것은 아래 세 종류다.

1. 조립 인터페이스(bootstrap/runtime)
2. 앱별 생명주기(생성/파기/디펜던시 바인딩)
3. 확장 포인트(플러그인) 전략

이때 한 번에 하나를 완성하기보다, 분리된 트랙을 병렬 진행하되 출구 조건만 공유해야 한다.

### 트랙 A — extension bootstrap 패키지 안정화 (차기)

- 범위:
  - `createWorkbenchExtensionRuntime` API 정리 및 문서화
  - `createWorkbenchServices`, `createWorkbenchHostBridge` 유틸 (선택)
  - command registry + context factory 주입 정책 고정
- 산출물:
  - `packages/vscode-extension/src/index.ts` 안정 API
  - 최소 통합 테스트(라우팅 3종)
- 출구 조건:
  - `pnpm --filter @workbench-kit/vscode-extension test` 통과
  - `pnpm --filter @workbench-kit/vscode-extension typecheck` 통과
  - runtime dispose 시 이벤트/리스너 정리 보증

### 트랙 B — Story/host 연동 경로 이전

- 범위:
  - `Workbench.stories.tsx`에서 직접 조립 코드 분리 후 bootstrap API 사용으로 1개 핵심 시나리오 전환
  - chat/patch/save 라우팅이 기존 동작과 동일한지 비교
- 산출물:
  - `IntegratedShell` 또는 동등한 baseline play-flow를 bootstrap API로 구성한 버전
  - 기존 인터랙션 비교 노트(패치/저장/커맨드/컨텍스트메뉴 핵심 경로)
- 출구 조건:
  - storybook play baseline 태그 통과
  - 화면 동작 스냅샷(또는 동등성 테스트) 기준 충족

### 트랙 C — plugin lifecycle 준비

- 범위:
  - 플러그인 설치/활성/비활성/업데이트 API를 bootstrap 구성 옵션으로 노출할지 결정
  - 충돌정책(`install` 중복, command id 충돌, menu merge) 정책 문서화
- 산출물:
  - `docs/workbench/plugin-lifecycle.md` 및 `migration-todo.md`에 정책 반영
  - `@workbench-kit/vscode-host` plugin service와 bootstrap 간 결합 포인트 초안
- 출구 조건:
  - 최소 실행 시나리오(install→enable→command 노출) 설계 승인
  - 계약 변경 없는 한 기존 테스트 회귀 영향 0

## 단계별 우선순위 (권장)

### 1단계 (현재)

트랙 B baseline 1개 시나리오(standalone 안정화) + 회귀 방어 기준 고정.

### 2단계

트랙 B 확장(나머지 핵심 시나리오) + 트랙 A 기본 설계 확정.

### 3단계

외부 앱(예: 기존 tilepaper 계열)에서 `@workbench-kit/vscode-extension`으로 점진 전환 가능한 마이그레이션 가이드 작성.

## 리스크와 의사결정 기준

- 리스크 1: story에서 bootstrap 도입으로 동작이 너무 급격히 바뀌는 것
  - 대응: 한번에 전체 변경하지 말고 baseline 1개 시나리오부터 전환.
- 리스크 2: plugin 정책이 너무 빨리 고착화되어 변경 불가 상태가 되는 것
  - 대응: `plugin lifecycle`은 설정 구조만 먼저 고정하고 정책값은 feature flag 또는 옵션으로 열어 둠.
- 리스크 3: 브랜치가 난립하여 설계 일관성 손실
  - 대응: `staging` 브랜치에서 2개 이상의 트랙 결과를 merge commit 기준으로 통합 검증 후 `main`으로 이관.

## 분기/병합 권장 방식

1. 현재 코드 개선은 단일 작업 브랜치(예: `feature/codex/standalone-app-bootstrap`)에서 진행해도 무방.
2. 트랙 단위로 sub-branch를 나눠도 되나, `staging`에서 합치기 전 설계를 서로 충돌 없게 검증.
3. 트랙별 완료 시 `feature` → `staging`은 가능하면 `--no-ff` merge commit로 의사결정 히스토리 유지.
4. 각 merge는 최소 1회 게이트 pass를 포함한 후 승인.
