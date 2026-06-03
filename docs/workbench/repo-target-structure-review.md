# Workbench UI Package — 타 저장소 목표 구조 대비 검토 (2026-06-03)

## 0) 목적

`newchobo-ui-package`에서 진행한 문서/설계가
`custom_launcher`, `tile_paper` 같은 타깃 저장소 목표 구조와 맞물릴 때
어느 정도 정렬되는지 점검한다.

목표:
- 문서 구조의 누락 항목 식별
- 타 repo 목표 구조 대비 기능/배치 차이 정리
- `ui-package`를 타 repo가 채택할 때 필요한 추가 기능을 선별
- 단계별 TODO 산출

## 1) 문서 구조 비교

### newchobo 기준 (`newchobo-ui-package`)

현재 문서는 `docs/workbench/*`와 `docs/conventions/*`로 분리되어 있지만,
내용이 계획 문서에 집중되어 있고 다음과 같은 성격 편차가 있다.

- `workbench-package-plan.md`, `workbench-multilane-implementation-plan.md`, `workbench-execution-roadmap.md`
  - 다중 라인 정렬과 마일스톤을 담당
- `subpackage-architecture.md`, `migration-todo.md`, `workbench-entrypoint-strategy.md`
  - 패키지 뼈대, 엔트리포인트 전략, 마이그레이션 TODO를 담당
- `vscode-extension-bootstrap-roadmap.md`, `plugin-lifecycle.md`
  - extension/플러그인 이월 항목을 담당
- `git-workflow.md`, `storybook.md`, `development-harness.md`
  - 운영 규칙/검증 규칙을 담당

### `custom_launcher` 기준

문서 체계는 목표 구조와 실행 계획이 더 분리되어 있다.

- `docs/developer/architecture/*`: 구조/책임/패키지 경계/핵심 계약
- `docs/developer/conventions/*`: 패키지 책임/책임 구분/보안/테스트 규칙
- `docs/developer/planning/*`: 목표 고도화, backlog, 확장 로드맵
- `docs/developer/testing/*`: extension/host/hostless 계약 테스트 항목
- `package.json scripts`: host 기반 다중 스크립트 검증 라인 (unit/e2e/contract/storybook)

### `tile_paper` 기준

- `docs/conventions/*`: 패키지 경계, 소스 구조 원칙, 테스트 전략
- `docs/developer/architecture/*`: 전체 도메인/실행 구조
- `docs/developer/specs/*`: 공개 API/DSL/프로토콜 정합성
- `docs/developer/planning/*`: 채택/개선 로드맵
- `docs/developer/reference/*`: 실제 도메인 참고 자료와 제외 항목

### 문서 구조 결론

`custom_launcher`와 `tile_paper`는 **패키지 경계 + 공개 API 계약 + 검증 게이트를 별도 문서군으로 묶는 패턴**이 더 선명하다.
`newchobo-ui-package`는 같은 내용을 담고 있으나, 문서군 간 링크와 합의 체크리스트가 분산되어 있다.

## 2) 타 목표 구조 대비 패키지/앱 맵

### `newchobo-ui-package` 현 구조

```text
packages/
  core
  workspace
  runtime
  contracts
  services
  adapters
  react
  vscode-host
  vscode-extension
  tokens
```

목표는 `standalone application launch` 우선.

### `custom_launcher` 현 구조

```text
packages/
  workbench-core, workbench-ui, launchpad-sdk, composition-core,
  provider-core, provider-sdk, ... (다수 domain package)
apps/
  vscode-*-extension, desktop-runtime
main/
  main process / preload / windows / tray / execution gateway
renderer/src/app/
  shared authoring surface
```

목표는 VS Code extension-first + ContentHub 공유 + canonical persistence
(`main` 주도) 중심이며, extension/desktop 런타임이 명확히 분리됨.

### `tile_paper` 현 구조

```text
packages/
  foundation, engine, model, renderer, ui, workbench-vscode-ui, ...
shared/
  contracts
apps/
  electron, web-editor, vscode-* , launcher-core
```

목표는 웹 편집기 + VS Code extension + electron host를 동일 core 패키지에서
재사용하고, host bridge는 명시적으로 분리.

### 목표 구조 비교 요약

- 타 repo 3곳 모두 공통:  
  1) UI package는 공유 가능한 shell/작업 surface 중심,  
  2) contracts는 host boundary/transport/패치/상태를 명확히 분리,  
  3) host adapter 계층을 별도 문서에서 관리.
- newchobo 대비 타 repo는 더 강하게 `공개 API governance`와 `host adapter 가드`를 선행.

## 3) 추가 검토: `ui-package` 채택 시 필요한 기능/기능 강화 항목

아래 항목은 두 타 repo 목표에서 반복적으로 요구되는 요소들이다.

### 필수로 바로 정리할 것 (현재 gap)

1. **앱/호스트 레이어 어댑터 스펙 문서화**
   - `React entrypoint`는 유지하되, host layer(standalone web, VS Code host, desktop shell)는 adapter로 명시적으로 분기.
   - 최소 구성: host API adapter 계약, 브릿지 실패 격리, lifecycle dispose/cleanup.

2. **패키지 공개 API 거버넌스**
   - `src` deep import 금지 가이드
   - browser-safe와 node-safe entrypoint 분리
   - 공개 export 변경 시 migration checklist 의무화

3. **plugin/기능 확장 구조의 2단계 설계**
   - 현재는 계약형 모델은 존재하나 install/enable/update/신뢰 정책이 미정.
   - 타 repo의 경험을 반영해 최소 상태기반 lifecycle + manifest-style contribution merge를 우선.

4. **저장/런타임 경계 정렬**
   - workspace save/patch/chat 스트림은 host와 앱이 모두 소비 가능한 contract로 고정.
   - 현재는 스토리 기반 조립 지점이 존재해 앱 bootstrap와 분리한 state owner가 필요.

5. **검증 라인 강화**
   - unit+storybook play는 유지하되 host contract/e2e smoke lane를 별도 추적.
   - contract test를 `runtime`/`plugin`/`storage`로 최소 분리.

### 선택적으로 다음 라운드에서 추가할 것

- 권한/트러스트 기반 plugin manifest(권장형태: manifest.json + contribution + engine 호환성)
- 패키지별 `browser`/`node` 빌드 entry 정책을 문서에 고정
- extension wrapper를 위한 bootstrap API 가이드(현재 Track C)
- settings scope/컨텍스트 key 유사 규약과 command/menu contribution 규격 정합성

## 4) 현재 상태 기준 TODO (대상: 다음 1~2회차)

### P0 (이번 사이클 마감 목표)

- [ ] `migration-todo.md`와 `subpackage-architecture.md`를 기준 문서로 고정하고,
  `repo-target-structure-review.md`에 추적 링크 3개 추가.
- [ ] `WorkbenchShell`/앱 조립 계약에서 host callback 경계(`onSave`, `onDelete`, `onChatSubmit`, `onPatch`)를
  타입으로 1회 정리하고 문서 근거 남기기.
- [ ] plugin 라이프사이클 최소 상태(`installing/installed/disabled/failed`)를 문서의 목표 형태로 확정.
- [ ] `adapter`/`service` 경계를 기준으로 `vscode-host` 예외 격리 케이스 2개 이상 테스트 보강.

### P1 (다음 사이클)

- [ ] `docs/conventions`에 “공개 API 거버넌스” 섹션 추가: entrypoint 규칙 + deep import 금지 + browser-safe 규칙.
- [ ] packages별 역할을 명시한 표를 `subpackage-architecture.md`에 정식 반영:
  - core/workspace/runtime/contracts/services/react/tokens/vscode-host/vscode-extension/adapters
- [ ] `contract test` 기초를 추가: 저장/채팅/패치 흐름에 대한 최소 스펙 시나리오.
- [ ] host adapter 샘플 문서(standalone, vscode-host, future app host) 작성.

### P2 (중기)

- [ ] plugin manifest/manifest schema 가이드 작성.
- [ ] plugin install/enable/update/rollback 흐름을 `custom_launcher` 유사한 policy로 분해.
- [ ] 문서 기반 acceptance 기준에 따라 `standalone launch`와 `extension wrapper` 단계 경계 분리 완료.

## 5) 검증 체크리스트

- `pnpm --filter @newchobo-ui/react typecheck`
- `pnpm --filter @newchobo-ui/services typecheck`
- `pnpm --filter @newchobo-ui/vscode-host test`
- `pnpm test:storybook-play:required`
- 문서 변경 후 `subpackage-architecture.md`, `migration-todo.md`, `workbench-entrypoint-strategy.md`,
  `repo-target-structure-review.md`의 목표 문구/체크리스트 동기화 완료

## 6) 결론

지금 단계에서는 `ui` 기능 자체 구현보다 “**타 repo 목표로 확장 가능한 공개 경계의 고정**”이 병목이다.
우선순위는 `앱 조립 경계 정리` → `host adapter 전략` → `plugin lifecycle 정책` 순서가 가장 현실적이다.
