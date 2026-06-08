# Workbench 다갈래 개발 로드맵 (2026-06-03 기준)

## 1) 먼저 결론: 화면에서 Workbench UI는 이미 구현되었는가?

네. 현재 구현 상태는 다음과 같습니다.

- `packages/react/src/workbench/Workbench.stories.tsx`의 `IntegratedWorkbenchShell`에서
  Explorer/Search/Editor/Chat/Settings/Status를 한 화면으로 조립해 렌더.
- 스토리북 baseline play 테스트도 동작 중이며, 필수 9개는 `storybook-play-required`로 고정 게이트되고 추가 coverage는 `storybook-play-baseline`로 보관됩니다.
- `WorkbenchShell`(레이아웃 컴포넌트)는 `packages/react/src/workbench/WorkbenchShell.tsx`로
  별도 추출되어 `packages/react/src/workbench/index.ts`에서 export됨.

즉, “UI 기능 자체”는 거의 구현되었고, 남은 과제는 **앱 조립 경계(런타임 바인딩) 정리**입니다.

## 2) 현재 증거 기반 상태

현재 필수 baseline 플로우(9개):

- `WorkspaceExplorer/CreateAndRenameFlow`
- `WorkspaceSearchPanel/ResultMenuFlow`
- `WorkspaceSearchPanel/EmptySearchStateFlow`
- `WorkspaceExplorer/FolderDeleteFlow`
- `WorkspaceEditorPanel/OpenTabCoordinationFlow`
- `WorkspaceEditorPanel/DeleteOpenTabRecoveryFlow`
- `ChatPanel/CancelRuntimeFlow`
- `ChatPanel/ErrorTransportFlow`
- `WorkspaceSearchPanel/KeyboardFlow`

### 코드 증거

- `WorkbenchShell` 공개 export
  - `packages/react/src/workbench/WorkbenchShell.tsx`
  - `packages/react/src/workbench/index.ts`
- 통합 조립은 여전히 Story에서 수행
  - `packages/react/src/workbench/Workbench.stories.tsx`의 `IntegratedWorkbenchShell`

### 타입/테스트 증거

- `WorkbenchShell` 컴포넌트 단위 테스트: `packages/react/src/workbench/WorkbenchShell.test.tsx`
- baseline Playwright 회귀: `pnpm test:storybook-play:required` (`storybook-play-required` 9개 대상)
- host/runtime 기본 타입/테스트:
  - `pnpm --filter @workbench-kit/vscode-host typecheck, test`
  - `pnpm --filter @workbench-kit/services typecheck`
- extension runtime API는 문서 동기화만 수행(코드/타입/테스트는 다음 cycle에서 실행)

### 문서 상태

- 현재 마일스톤/우선순위는 `standalone launch` 우선 + extension bootstrap 이월이 반영된 상태로 통일 중.
- 이번 사이클에서 vscode-extension 브랜치 변경은 보류. 실행은 `react` + `services` + `vscode-host` 경로만 검증한다.

## 3) 다갈래 전략(필수 분기)

## Lane A: ui-package 런치-레디 정리 (최우선)

- 목적: story 조립 의존도를 낮추고 앱이 직접 조립 가능한 API로 정리
- 범위:
  - `WorkbenchShell`에 대한 런치 계약(상태/서비스/커맨드) 안정화
  - story는 조립 fixture 역할로 축소
- 산출:
  - 앱 bootstrap 계약 타입 + 최소 어댑터
  - 통합 story에서 동일 동작 재사용
- 게이트:
  - `pnpm --filter @workbench-kit/react typecheck`
  - `pnpm test:storybook-play:required`

## Lane B: standalone 런타임 하드닝 (동일 우선순위로 병행 가능)

- 목적: `vscode-host` + services 경계 신뢰성 강화
- 범위:
  - 구독/구독 해제/재구독 idempotency
  - callback 실패 격리
  - patch/chat/save 이벤트 오염 방지
- 산출:
  - 핵심 path 예외 테스트
- 게이트:
  - `pnpm --filter @workbench-kit/vscode-host test`
  - `pnpm --filter @workbench-kit/services typecheck`
- baseline 시나리오 회귀 (9개)

## Lane C: `vscode-extension` 래퍼 패키지 (차기)

- 현재는 구현 API는 있으나 앱용 정식 launch wrapper는 보류
- `feature/codex/vscode-extension-wrapper`(또는 유사명) 브랜치에서 진행
- 산출:
  - extension 가이드 + 사용 예시
  - 기존 runtime/service 계약 사용 예시 정렬
- 게이트:
  - `pnpm --filter @workbench-kit/vscode-extension test`
  - `pnpm --filter @workbench-kit/vscode-extension typecheck`

## 4) 단기 실행 계획(현재 사이클)

### Step A-1: 앱 계약 설계(3개)

1. `WorkbenchShell` 사용을 위한 props contract 확정
2. side-effect boundary 정책 확정:
   - 저장/삭제/패치/컨펌/토스트는 앱/호스트 콜백으로 위임
3. 문서/타입으로 결정사항 고정

### Step A-2: story 통합 분리

1. `IntegratedWorkbenchShell`을 “조립자”로 남기고
2. 라이브 상태 및 서비스 생성은 fixture/adapter에서 주입
3. 기존 baseline 동작 라벨별 재현성 검증

### Step B-1: host 런타임 안정성 보강

1. 메시지 브릿지 실패 격리 테스트 추가
2. 중복 dispose/중복 구독 제거

### Step C-준비

1. `@workbench-kit/vscode-extension` 문서와 API 기준 정렬용 note 정비
2. 차기 브랜치에서 wrapper entry 문서화를 위한 체크리스트 작성

## 5) 위험/의사결정

- shell 레이아웃은 완료되어 있다고 오판해 바로 Track C로 들어가는 실수를 방지
- 반대로 `WorkbenchShell`을 전체 앱 런치로 착각하면 callback/서비스 주입 누락으로
  런타임 버그 발생 우려
- 문서-코드 간 불일치가 쌓이면 결정 지연 발생 가능성

## 6) 즉시 승인 기준(현재 사이클 종료 기준)

- `WorkbenchShell`은 배포 가능한 shell 레이아웃 구성요소로 공개 유지
- baseline story play 흐름(탐색기/검색/에디터/채팅/셋팅) 9개 동작 유지
- extension 관련 코어 변경은 보류, API와 문서 이월 계획은 명시
- lane별 게이트를 만족하는 상태에서 다음 브랜치로 단계 이동
