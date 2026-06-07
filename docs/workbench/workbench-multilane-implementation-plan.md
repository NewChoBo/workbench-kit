# Workbench Multi-Lane Implementation Plan (v1)

## 1) 현재 상태 증명(요약)

- 화면에서 Workbench UI는 구현되어 있다.
  - `packages/react/src/workbench/Workbench.stories.tsx`의 `IntegratedWorkbenchShell`는
    Activity/Explorer/Search/Editor/Chat/Settings/Status를 한 번에 조립해 렌더한다.
  - 해당 통합 스토리는 Play 상호작용(탐색기 메뉴, 검색, 에디터 탭 액션, 챗 전송/패치 반영)까지 검증한다.
- 단, `@workbench-kit/react`는 shell 레이아웃 진입점은 추출/공개했지만,
  상태/서비스 바인딩 계약은 아직 앱 bootstrap 수준으로 완전 정리되지 않았다.
- `vscode-extension` 패키지는 이미 조립 API를 갖고 있고(`createWorkbenchExtensionRuntime`) 테스트·타입체크가 통과되어 있다.
- `vscode-host`/`services` 패키지도 메시지 라우팅 및 오케스트레이션 경로가 동작 준비된 상태다.

### 증거 테이블(현재 상태 vs 목표치)

| 검증 항목                  | 현재 상태 증거                                                                                                   | 목표와의 차이                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| UI 동작 구현               | `IntegratedWorkbenchShell`에서 6개 영역(Explorer/Search/Editor/Chat/Settings/Status) 통합 렌더 및 play flow 검증 | 현재 Storybook 조립 안에서만 즉시 기동                             |
| 공개 진입점                | `packages/react/src/workbench/index.ts`는 shell 레이아웃 export 완료                                             | 앱 런치용 바인딩 계약이 남아 있어 추가 정렬 필요                   |
| 런타임 bootstrap           | `@workbench-kit/vscode-extension`의 `createWorkbenchExtensionRuntime` 제공                                       | extension 전용 bootstrap은 있어도 package-level 앱 엔트리와 분리됨 |
| 저장/채팅/패치 서비스 계층 | `@workbench-kit/services`, `@workbench-kit/adapters` 구성 완료                                                   | 서비스 호출 주체를 story가 아닌 host/앱 조립기로 이동 필요         |

### 판단 결론

- 질문: “이미 화면에서 구현됐나?” -> 네. 구현은 `IntegratedWorkbenchShell`에서 검증 완료.
- 질문: “이걸 패키지로 바로 쓸 수 있나?” -> 기본 shell은 가능하지만, **앱 런타임 바인딩 계약 분리**가 선행되어야 한다.

### 즉시 판단: “화면에 Workbench UI가 이미 구현되어 있나?”

예. `packages/react/src/workbench/Workbench.stories.tsx`의 `IntegratedWorkbenchShell`이
Explorer/Search/Editor/Chat/Settings/Status까지 화면을 한 번에 구성하고, play flow도 검증한다.
다만 이 구현은 **Storybook 통합 코드** 안에서 상태·서비스를 직접 조립하고 있고,
`@workbench-kit/react`의 공개 API는 shell을 노출하고 있으나, 앱 런타임을 즉시 임포트 가능한 완전한 조합체로 만들려면
상태/서비스/명령 바인딩 계약 정리가 추가로 필요하다. UI 기능 자체는 이미 거의 완성된 상태다.

### 다중 갈래 분해 계획(요약)

- 갈래 1 (A): `ui-package` 단독 사용성이 빠른 shell 엔트리 포인트 제공
  - 산출: `packages/react/workbench`에서 사용할 수 있는 app-shell factory 또는 컴포넌트.
  - 성능/회귀 포인트: 스토리 동작 동일성 1:1 유지.
- 갈래 2 (B): `standalone runtime` 안정화
  - 산출: `vscode-host` + `services` 조합, 구독/구조 정리, 예외 격리 강건화.
- 갈래 3 (C): `vscode-extension` 패키지 공식 런치 패스 정렬 (차기)
  - 산출: 현재 `createWorkbenchExtensionRuntime` 위에 앱 조립 레이어를 문서/테스트로 고정.
  - 조건: 갈래 1~2 스테이블 이후 진행.

## 2) 분기 전략(여러 갈래 개발)

### 실행 범위 고정 (2026-06-03)

이번 사이클에서 목표는 `standalone` 런타임 기동이다.  
따라서 `vscode-extension` 쪽 코드는 **개선, 수정, 통합 플로우 변경을 보류**하고, 기존 API 정합성만 유지한다.

### 레인 A — `ui-package` 진입점 정규화 (우선순위 1)

`@workbench-kit/react/workbench`에 실제 앱이 바로 import 가능한 워크벤치 엔트리포인트를 만든다.

#### 산출물

- `WorkbenchShell`(또는 동등한 이름)의 공개 컴포넌트/팩토리
- 최소한의 제어 API (예: 상태/워크스페이스 데이터/서비스 훅)
- `Workbench.stories.tsx`에서 새로운 엔트리포인트를 사용해 회귀 동작 재사용

#### 게이트

- storybook baseline flow 회귀(현재 baseline tag) 통과
- `@workbench-kit/react` 타입체크 통과
- 기존 컴포넌트 API 호환성 유지

### 레인 B — Standalone 런타임 고도화 (우선순위 2)

앱이 `ui-package`를 조합해 기동되는 경로를 안정화한다.

#### 산출물

- host/runtime + services 조합 패턴 문서화
- dispose/구독 정리와 실패 격리 규칙 고정
- runtime/extension 브릿지 예외 경로 회귀 테스트

#### 게이트

- `pnpm typecheck` (standalone lane: react/services/vscode-host 중심)
- `@workbench-kit/vscode-host` test/typecheck
- `@workbench-kit/services` typecheck
- `pnpm test:storybook-play:required` 통과
- `pnpm typecheck:all`은 추적 검증 완료 후 확장 단계에서 실행

### 레인 C — vscode-extension 래퍼 패키지 완결 (우선순위 3, 차기)

레인 A/B 결과를 기반으로 extension 패키지를 정식 진입 경로로 확장한다.

#### 산출물

- `createWorkbenchExtensionRuntime` 사용 가이드/예제
- command registry + repository + transport + service options의 인터페이스 확정

#### 게이트

- `@workbench-kit/vscode-extension` test/typecheck
- 최소 1개 통합 플로우를 extension 조립 API로 구성 가능

## 3) 단계별 실행안 (현재 사이클 권장)

### Step 1 — 분석 동결 + 인터페이스 동결

- 기존 story 통합 상태를 "기준 동작 목록"으로 잠금
- shell 상태/커맨드/서비스 경계를 type-level로 고정
- 문서(`subpackage-architecture`, `migration-todo`)의 분기 위치 갱신

#### Step 1 상세 산출물

- baseline 플로우 목록 확정(예: explorer create/rename, editor tab coordination, chat patch apply, runtime cancel)
- shell 공용 props contract 초안(상태 + 워크스페이스 data + 액션 핸들러 + 서비스 adapter)
- 엔트리포인트에서 제외할 story-only fixture 목록(샘플 코드, 설명 텍스트, 내부 테스트용 임시 데이터)

#### Step 1 산출물 기반 승인 기준

- baseline 강제 목록(확인 대상 9개):
  - `WorkspaceExplorer/CreateAndRenameFlow`
  - `WorkspaceSearchPanel/ResultMenuFlow`
  - `WorkspaceSearchPanel/EmptySearchStateFlow`
  - `WorkspaceEditorPanel/OpenTabCoordinationFlow`
  - `WorkspaceEditorPanel/DeleteOpenTabRecoveryFlow`
  - `WorkspaceExplorer/FolderDeleteFlow`
  - `ChatPanel/CancelRuntimeFlow`
  - `ChatPanel/ErrorTransportFlow`
  - `WorkspaceSearchPanel/KeyboardFlow`
  - 위 9개는 `tags: storybook-play-required`로 구분되며, storybook baseline 후보는 별도 태그로 누적 관리.
- Step 1 종료 시점에 이 9개 시나리오의 실행 경로가 `WorkbenchShell` 추출 시에도 그대로 재현 가능한지 설계 문서로 명시.

### Step 2 — 워크벤치 엔트리 포인트 뼈대 구현

- `WorkbenchShell` 컴포넌트/팩토리 추가(아직 내부 상태는 story 상태를 주입 가능하게 설계)
- 최소 prop contract:
  - 액티비티 목록
  - 상태 모델(state + dispatch 또는 shell 상태 훅 주입)
  - 워크스페이스 데이터/액션 콜백
  - chat/send/patch/save 핸들러
- Story에서 기존 통합 플로우를 동일 시나리오로 회귀 적용

#### Step 2 상세 산출물

- `src/workbench/shellFactory.ts`(예시) 또는 `WorkbenchShell` 컴포넌트 정식 export
- `react` 패키지 `index.ts` export 확장
- story가 직접 조립 로직을 하지 않고 엔트리포인트를 호출하도록 전환
- 최소 API 단위 테스트(렌더/기본 액션 라우팅)

### Step 3 — standalone 경로 정합성

- `vscode-host` 측 message bridge 경로와 runtime 경계 회귀 강화
- `chat/chat -> patch -> workspace` 흐름 실패격리 강화
- 필요한 최소 테스트를 host/story 통합으로 추가

#### Step 3 상세 산출물

- `host runtime` dispose 중복 호출/구독 해제 idempotency 케이스 추가
- patch/chat 실패 시 UI 상태와 콜백 전파가 서로 격리되는지 테스트 강화
- `playground`나 sample app에서 story와 동일 baseline 3개 이상 재현

### Step 4 — vscode-extension 차기 연결

- extension 패키지에서 새 엔트리포인트를 조립해 사용하도록 문서+테스트 추가
- 플러그인/라이프사이클은 현재 설계/마일스톤 추적으로 분리

#### Step 4 상세 산출물

- `@workbench-kit/vscode-extension`의 사용 가이드 문서 1건
- create-workbench bootstrap helper를 기준 API로 고정한 1건의 통합 예시
- `Track A` 진입 조건 문서(StandAlone 완료 조건 + 회귀 기준)

## 7) Track A 최소 API 제안(실행 전 합의안)

이 목표가 "스토리 유사 동작을 그대로 유지하면서도 패키지 소비자에게 즉시 제공"되려면,
초기 단계의 shell API는 아래 정도로 최소화하는 것이 현실적이다.

```ts
export interface WorkbenchShellDataAdapter<TPath = string> {
  initialFiles: WorkspaceFile[];
  onLoadFile?: (path: TPath) => Promise<WorkspaceFile | null>;
}

export interface WorkbenchShellCallbacks {
  openSettings?: () => void;
  onSave?: (path: string, content: string) => Promise<void> | void;
  onDelete?: (path: string) => Promise<void> | void;
  onCancelChat?: () => void;
  onChatSubmit?: (message: string) => Promise<void> | void;
  onRuntimePatch?: (patch: WorkspacePatchEvent) => Promise<void> | void;
}

export interface WorkbenchShellProps<
  TActivityId extends string = 'explorer' | 'search' | 'chat',
  TTheme extends string = 'light' | 'dark',
> {
  title?: string;
  activities: { id: TActivityId; label: string; icon?: ReactNode }[];
  theme: TTheme;
  onThemeChange: (theme: TTheme) => void;
  data: WorkbenchShellDataAdapter;
  commandRegistry: CommandRegistry<WorkbenchShellCommandContext<TActivityId>>;
  callbacks: WorkbenchShellCallbacks;
}
```

### API 제약(필수)

- 스토리 전용 샘플 데이터(예: `workspaceFiles`)는 앱 주입이 아닌 기본값으로 제공하지 않음.
- side-effect는 모두 callbacks로 위임(저장, 삭제, confirm/alert, 네비게이션 외부화).
- 서비스 인스턴스 자체는 app/bootstrap 레이어에서 생성·주입.

## 3.5) 실행 우선순위와 브랜치 전략(권장)

- 현재 브랜치(standalone-first): Step 1~3만 수행
- `vscode-extension` 코드 편집은 `feature/codex/vscode-extension-bootstrap-deferred` 같은 별도 브랜치에서 차기 수행
- 문서/테스트만 동기화는 허용하되 API 시그니처 변경은 Track A/B 안정화 이전엔 금지

## 4) acceptance checklist (변경 전/후 비교)

### 변경 전

- UI는 story 동작은 하더라도, shell 공개는 완료되었고 앱 런칭용 통합 바인딩 계약이 미완성
- extension 사용자는 내부 조립 로직을 알 필요가 있었음

### 변경 후(레인 A 완료 시)

- 앱 소비자가 `@workbench-kit/react/workbench`에서 진입점 사용 가능
- `Workbench.stories.tsx`는 동일 행동 보장하면서도 “구성 코드” 역할을 하게 됨
- plugin/install lifecycle은 별도 추적 항목으로 분리

## 5) 리스크 및 대응

- **리스크:** 엔트리포인트 추출 시 story 전용 fixture가 섞임
  - 대응: 저장/네트워크/확인 다이얼로그를 `host callback`/`adapter`로 강제 주입
- **리스크:** 레인 C를 레인 A와 동시에 진행 시 API 흔들림
  - 대응: extension은 레인 A/B 완료된 public contract만 참조
- **리스크:** 테스트 갭
  - 대응: baseline story 흐름 + host 단위 테스트 2중 장치로 커버

## 6) 다음 7일 실천 목표 (단기)

1. 레인 A 작업 항목 1: 엔트리포인트 설계안 초안 확정 (타입/Props/콜백)
2. 레인 A 작업 항목 2: story에서 추출 후 회귀 실행
3. 레인 B 작업 항목 3: host runtime dispose/subscribe/콜백 격리 테스트
4. 상태 공유: 이번 변경분은 `migration-todo`와 `subpackage-architecture`에 반영 후 실행

## 6.5) 단계별 완료 기준(성공 판정)

- 1주차 목표 달성 조건: Step 1 완료 + Step 2 1차 엔트리포인트 정의 + baseline 9개 story-tag 플로우 회귀 준비
- Step 2 완료 조건: `WorkbenchShell`(또는 동등 타입) 공개 export + story가 엔트리포인트를 호출
- Step 3 완료 조건: `dispose`, 구독 예외 격리 테스트 추가 + `pnpm test:storybook-play:required` green
- Step 4 진입 조건: Step 1~3의 성공 판정이 모두 통과하고 `migration-todo`에 extension 차기 조건 명시
