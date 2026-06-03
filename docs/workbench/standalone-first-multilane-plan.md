# Workbench 다갈래 실행 계획 (현 시점 최종안, Standalone First)

작성일: 2026-06-03

## 1) 핵심 질문 정답

### Q1) 지금 화면에서 Workbench UI가 구현됐나?
네. **구현되어 있다.**

근거:
- `packages/react/src/workbench/Workbench.stories.tsx`의 `IntegratedWorkbenchShell`가 Explorer/Search/Editor/Chat/Settings/Status를 한 화면에서 조립해 렌더.
- Storybook baseline 플레이 플로우 태깅이 존재:
  - `WorkspaceExplorer/CreateAndRenameFlow`
  - `WorkspaceSearchPanel/ResultMenuFlow`
  - `WorkspaceEditorPanel/OpenTabCoordinationFlow`
  - `WorkspaceEditorPanel/DeleteOpenTabRecoveryFlow`
  - `ChatPanel/CancelRuntimeFlow`
- `pnpm test:storybook-play:required` 실행에서 5개 required suite 중 핵심 flow 통과 이력 존재.
- 현재 shell 레이아웃은 `packages/react/src/workbench/WorkbenchShell.tsx`에서 추출/공개됨.
- services + host lane는 독립 패키지로 존재.

### Q2) 즉시 목표는?
현재는 `standalone application launch` 안정화가 1순위이고, `vscode-extension`은 2차.  
즉, “지금은 UI를 앱처럼 조립 가능한 계약”을 정리하고, extension 래퍼는 다음 마일스톤에서 정식 고도화.

## 2) 현재 상태 진단(구성단위별)

| 영역 | 상태 | 근거 | 남은 공백 |
|---|---|---|---|
| UI 표면 | 구현 완료 | ActivityBar/Search/Editor/Chat/Explorer/Settings/Status 통합 확인 | 엔트리포인트/조립 계층 정리 필요 |
| 상태 바인딩 | 부분 완료 | `useWorkbenchShellState` + shell state export 존재 | 앱 소비자 측에서 즉시 주입 가능한 “조립 계약”은 미완성 |
| 채팅/저장/패치 서비스 | 구현 | `@newchobo-ui/services` 패키지 내 서비스 존재 | story-level orchestration 잔존 |
| host 런타임 | 구현 | `@newchobo-ui/vscode-host` runtime/bridge/typecheck/test 동작 | 구독·dispose·실패격리 강화 필요 |
| extension wrapper | API 수준 존재 | `packages/vscode-extension/src/index.ts`에서 `createWorkbenchExtensionRuntime` 제공 | 제품 진입점으로 쓰기엔 계약 정합성/문서/가이드 보완 필요 |

## 3) 다갈래 개발 모델 (권장)

### Track A — ui-package의 Standalone Entry 정규화 (최우선)
- 목표: `@newchobo-ui/react`로부터 외부 앱이 Workbench를 직접 조립.
- 핵심 산출:
  - 엔트리포인트/팩토리 타입 계약 정리
  - side-effect 분리: 저장/삭제/확인/알림/퍼시스턴스는 callback/adapter 위임
  - `Workbench.stories.tsx`는 fixture/play 역할로 축소
- 성공 기준:
  - `@newchobo-ui/react` typecheck 통과
  - baseline 5개 플레이 flow 재현

### Track B — Standalone 런치 하드닝 (동시 병행 가능)
- 목표: `vscode-host` + `services` + 조립 경로 신뢰성 강화
- 핵심 산출:
  - dispose/idempotent 구독 정리
  - chat/chat cancel/patch/save 실패 격리
  - callback 전달 순서·오염 방지 테스트 강화
- 성공 기준:
  - `pnpm --filter @newchobo-ui/vscode-host test`
  - `pnpm --filter @newchobo-ui/services typecheck`
  - baseline 플레이 실패율 0

### Track C — vscode-extension wrapper 정식화 (차기)
- 목표: extension 패키지를 Track A/B의 공개 계약 위에 얹는 정식 진입점으로 전환
- 핵심 산출:
 - `createWorkbenchExtensionRuntime` 소비 가이드
 - wrapper 조립 예시 1건
 - command/repository/transport/service 조합의 문서 정합성
- 성공 기준:
  - `pnpm --filter @newchobo-ui/vscode-extension typecheck`
  - `pnpm --filter @newchobo-ui/vscode-extension test`

## 4) 단계 목표(이번 사이클)

### 단계 1 — 기준 고정 (오늘/1일)
- UI baseline 5개 시나리오를 변경 불가 기준으로 고정
- 스토리에서 수행되는 조립/오케스트레이션과 패키지 경계 분리 규칙 문서화

### 단계 2 — Track A 실행 (1~2일)
- `WorkbenchShell` 진입점 최소 props contract 확정
- `IntegratedWorkbenchShell`을 진입점 호출형으로 전환
- `@newchobo-ui/react/index.ts` export 정리

### 단계 3 — Track B 병행 (2~3일)
- host runtime 실패/구독/정리 케이스 강화 테스트 추가
- chat/cancel 중 patch 수신, 반복 dispose, listener throw isolation 보강

### 단계 4 — 통합 게이트
- `pnpm test:storybook-play:required`
- `pnpm --filter @newchobo-ui/react typecheck`
- `pnpm --filter @newchobo-ui/vscode-host typecheck`
- `pnpm --filter @newchobo-ui/services typecheck`
- `pnpm --filter @newchobo-ui/vscode-host test`

## 5) 왜 이 순서가 맞는가

- 현재 목표가 standalone이고, extension wrapper는 이미 API가 있으나 사용성 경계는 미완성.
- Track A에서 조립 계약만 먼저 정리하면, Track C는 wrapper만 extension 전용 구성으로 이동시키면 되어 개발 속도가 빨라짐.
- Track B를 병행하면 런타임 안전성 검증을 확정해 wrapper 전환 비용을 줄임.

## 6) 다음 7일 액션 리스트(우선순위)

1. `WorkbenchShell` entry contract 타입/옵션 초안 승인
2. story 통합 로직에서 orchestration(저장/패치/삭제/확인) 주입 지점 식별·분리
3. `test:storybook-play:required` baseline 고정 포인트 재확인
4. host runtime 구독/종료/예외 격리 테스트 보강
5. `staging` 병합 전 검증 보고서(`migration-todo`, `subpackage-architecture`) 동기화

## 7) 브랜치/운영 원칙 (권장)

- `feature/codex/standalone-app-launch-hardening` 또는 파생:
  - Track A/B 병행 PR
- `feature/codex/vscode-extension-wrapper`:
  - Track C는 다음 사이클로 이월
- `vscode-extension` 코드 변경은 현재 사이클에서 지양, 문서와 상태만 동기화

## 8) 현재 통합 로직 소유권 정리(근거 기반 분해)

`Workbench.stories.tsx`의 `IntegratedWorkbenchShell` 안에서 현재 수행되는 오케스트레이션은 다음 5개 범주로 분해할 수 있습니다.

- 데이터/상태 소유(현재 스토리 내부): `useVirtualWorkspace`, `useWorkbenchShellState`, 로컬 state(메뉴/모달/입력/상태바 라벨)  
- 워크스페이스 변경(현재 스토리 내부):
  - 생성/삭제/이름변경/이동: `createWorkspaceFile`, `deleteWorkspaceFile`, `renameWorkspaceFile`, `moveWorkspaceFile`
  - 오픈/닫기: `openFile`, `closePath`, `closeOtherFiles`, `closeAllFiles`
  - 검색/트리 계산: `searchQuery`, `searchResults`, `getWorkspaceFileMovePlan`, `workspaceTree`
- 저장(현재 스토리 내부 + services 위임):
  - `WorkspaceSaveService.saveDraft` 호출 및 `SaveResult` 처리
  - 사용자 확인/알림(`setLastCommandLabel`)은 현재 host callback 역할
- 채팅/패치 경로(현재 스토리 내부):
  - `WorkbenchChatService` 생성/구독
  - `workspacePatchService.applyPatch` + 패치 완료 후 open/select 로직
- 코멘트/오버레이(현재 스토리 내부):
  - ContextMenu/ConfirmDialog/SettingsModal 표시 및 종료

### 분해 목표(Track A/B로 이식)

- 앱이 사용할 조립 API는 위 소유권 중 “어플리케이션 side-effect”를 받아들이도록 해야 합니다.
- 권장 이동:
  - `saveFile/deleteFile/confirm`류는 host callback 또는 adapter로 추상화
  - 메시지 subscribe/dispose, 에러 라벨링, 상태바 메시지 라우팅은 bootstrap layer로 이동
  - UI components는 callback/result를 받아 렌더링만 수행

## 9) vscode-extension wrapper 상태와 다음 사이클 문턱값

현재 `packages/vscode-extension/src/index.ts`의 `createWorkbenchExtensionRuntime`은 host/runtime 조립 기능을 제공하지만,
`WorkbenchShell` 수준 조립(레이아웃, 메뉴/패널 연결, 저장/삭제 다이얼로그 정책)은 제공하지 않습니다.

다음 사이클로 이월할 문턱값:

- Track A에서 정리한 `WorkbenchShell` bootstrap 계약이 고정된 뒤에 wrapper가 그 계약을 소비하도록 설계
- 아래 3개를 한 번에 충족할 경우에만 Track C 시작:
  1. 엔트리point에서 사이드이펙트 분리 규칙(확인/알림/영속성/오케스트레이션)이 타입/문서로 고정
  2. baseline 5개 시나리오가 refactor 후에도 변경 없이 실행
  3. host runtime 테스트에서 dispose/구독/예외 격리 회귀가 붙음
