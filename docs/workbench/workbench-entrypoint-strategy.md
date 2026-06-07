# Workbench UI Package Entry Strategy (2026-06-03)

## 핵심 결론

예. **현재 화면 기준 Workbench UI는 구현되어 있다.**

- 통합 화면 조립: `packages/react/src/workbench/Workbench.stories.tsx` (`IntegratedWorkbenchShell`)
- 엔트리 layout: `packages/react/src/workbench/WorkbenchShell.tsx` +
  `packages/react/src/workbench/index.ts`
- 런타임/호스트/서비스: `packages/vscode-host/src`, `packages/services/src`,
  `packages/vscode-extension/src`

남은 핵심은 **UI의 추가 구현이 아니라, 앱 조립 계약의 분리**다.  
이번 사이클은 `standalone application launch`를 최우선으로 처리하고, `vscode-extension` 정식 wrapper/패키징은 다음 마일스톤으로 이월한다.

## 현재 증거(최근 확인)

- `pnpm typecheck`
- `pnpm --filter @workbench-kit/services typecheck`
- `pnpm --filter @workbench-kit/vscode-host test`
- `pnpm exec vitest run packages/services/src` (28 tests)
- `pnpm test:storybook-play:required` (`storybook-play-required` 9개 pass)
- `pnpm test` (all repos 21 passed)

## 다중 트랙 로드맵

### Track A — Standalone Entry API (최우선, 이번 사이클)

목표: `@workbench-kit/react`를 소비 앱에서 바로 조립 가능한 API로 정리.

산출:

- `WorkbenchShell`/`WorkbenchHostBridge` 또는 동등한 진입점 타입
- 앱 주입형 상태/서비스/커맨드/콜백 경계
- `Workbench.stories.tsx`는 fixture/어댑터만 조합

완료 조건:

- 엔트리 타입이 문서화되고 컴파일 통과
- story가 엔트리 경유로 동일 동작
- 변경 후 `pnpm --filter @workbench-kit/react typecheck` + `pnpm test:storybook-play:required` 통과

### Track B — Standalone 런치 하드닝 (동시 진행 가능)

목표: host/runtime/service 경계 안정성 확정.

산출:

- message bridge 실패 격리/리스너 정리 테스트
- chat/cancel, patch/save 경로 예외 시나리오 회귀
- dispose/idempotent 정리 강화

완료 조건:

- `pnpm typecheck` + `pnpm --filter @workbench-kit/vscode-host test` 통과
- 주요 예외 케이스가 단위 테스트로 커버

### Track C — vscode-extension wrapper (차기)

목표: standalone 엔트리와 extension wrapper를 1:1 정렬.

조건:

- Track A/B 출구 조건 충족 후 별도 브랜치에서 진행
- extension API는 다음 마일스톤에서 public 계약으로 정식화

## 단계별 실행 제안 (실행 전환용)

### 1단계: 트랙 경계 고정 (현재)

1. entrypoint 계약 최소 타입 선정:
   - `workspace`/`theme`/`activity`/`shell state`/`status section`
   - 필수 host callback(`onSave`, `onDelete`, `onChatSubmit`, `onPatch`)
2. story 전용 side-effect 축소 규칙 고정
   - confirm/알림/모달/영속성은 story/호스트 callback 위임
3. 문서 기반 게이트 재점검
   - `workbench-entrypoint-strategy`, `subpackage-architecture`, `migration-todo` 동기화

### 2단계: Track A 1차 구현

1. 앱 조립용 adapter/props 인터페이스 생성
2. 통합 흐름 `IntegratedWorkbenchShell`을 새 엔트리 호출 구조로 스냅샷 전환
3. 기존 baseline flow 회귀 검증

### 3단계: Track B 보강

1. host runtime/bridge 테스트 보강
2. dispose/리스너/예외 격리 포인트 추가
3. baseline 9개 인터랙션 다시 실행

## 종료 기준(객관)

- [x] UI/기능 동작은 유지됨 (baseline 플레이 9개 + 핵심 컴포넌트 테스트)
  - transport 실패 경로까지 포함한 `ChatPanel/ErrorTransportFlow`가 기본 회귀 경로에 포함됨.
  - 근거: `pnpm test:storybook-play:required`, `@workbench-kit/react` typecheck,
    `@workbench-kit/vscode-host` test
- [x] 앱 조립 계약의 최소 형태가 타입/문서로 고정됨
  - 근거: `packages/react/src/workbench/standalone.ts`의
    `WorkbenchHostCallbackBoundary`
- [x] story는 조립 로직의 fixture 역할로 수렴
  - 근거: `packages/react/src/workbench/Workbench.stories.tsx`의
    `IntegratedWorkbenchShell`은 story fixture/state/mock runtime을 보유하고,
    `WorkbenchStandaloneShell`에 bootstrap과 render slot을 위임
- [x] `vscode-extension`는 다음 사이클로 이월 상태가 문서에 남음
  - 근거: Track C를 차기 milestone으로 분리

## 브랜치 제안

- 현재 브랜치: `feature/codex/standalone-app-launch-hardening`
- Track A 하위 브랜치: `feature/codex/standalone-workbench-entry`
- Track B 하위 브랜치: `feature/codex/standalone-runtime-hardening`
- 통합 브랜치: `staging`에서 merge 후 게이트 통과
- extension wrapper 보류 브랜치: `feature/codex/vscode-extension-wrapper-deferred`

## 즉시 다음 액션

1. UI baseline 유지를 `pnpm test:storybook-play:required`로 재확인
2. 매 분기말 게이트: `pnpm test:storybook-play:required` + `pnpm typecheck`
3. `vscode-extension` wrapper는 Track C 조건 충족 후 별도 마일스톤에서 재개
