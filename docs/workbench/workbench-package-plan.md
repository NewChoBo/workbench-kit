# Workbench 패키지형 다중 트랙 실행 계획 (심층)

작성일: 2026-06-03  
목표: `ui-package`의 Storybook 구현 자산을 프로덕션/어플리케이션 조립 가능한 패키지로 전환하고, 당장은 `standalone application launch`를 완료한 뒤 다음 주기에서 `vscode-extension` 래퍼 패키지를 정식화한다.

---

## 1) 현재 상태 진단(근거 기반)

### 1.1 "이미 구현되어 있나?" 답

네, 화면에서 동작하는 Workbench UI 구현은 되어 있습니다.

- `packages/react/src/workbench/Workbench.stories.tsx`
  - `IntegratedWorkbenchShell`에서 Explorer / Search / Editor / Chat / Settings / Status를 한 화면에서 조립
- Baseline 후보는 `storybook-play-baseline` 태깅하고, CI 필수는 `storybook-play-required`로 분리 고정
- 현재는 스토리 조립이 기본 동작 베이스이지만, 앱 전용 엔트리포인트의 상태/서비스 바인딩 추출이 다음 단계입니다.
  - `packages/react/src/workbench/WorkbenchShell.tsx`는 shell 레이아웃으로 추출되었고 `index.ts`에서 export됩니다.
  - 다만 저장/삭제/패치 커밋/커맨드 컨텍스트 바인딩은 아직 story 조합 경로에 강하게 묶여 있습니다.
  - `packages/react/src/workbench/Workbench.stories.tsx`의 `IntegratedWorkbenchShell`은 현재 상태/서비스 오케스트레이션의 대부분을 담당.

### 1.2 현재 패키지 구간별 성숙도

| 구간                     | 상태           | 근거                                                                                                                                                                                          |
| ------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI 컴포넌트/상태/명령    | 구현됨         | `ActivityBar`, `WorkspaceExplorer`, `WorkspaceEditorPanel`, `WorkspaceSearchPanel`, `ChatPanel`, `WorkbenchSettingsModal`, `WorkbenchNavigationPanel`, `WorkbenchSectionedPanel`, `StatusBar` |
| 통합 진입점(패키지 공개) | 부분완료       | shell 레이아웃 export는 완료, 앱 조립 계약은 다음 단계에서 정리 필요                                                                                                                          |
| 서비스 계층              | 구현됨         | `WorkbenchChatService`, `WorkspaceSaveService`, `WorkspacePatchService`                                                                                                                       |
| 호스트 런타임            | 구현됨         | `vscode-host` bridge/runtime 정상 동작                                                                                                                                                        |
| extension wrapper        | 구현 가능 단계 | `packages/vscode-extension` 패키지 존재, typecheck/test 실행 가능                                                                                                                             |

### 1.3 결론

현재 상태는 **“동작 구현 완료 + shell 공개”**이지만, **앱 런칭 계약(상태/서비스 바인딩 추출)**이 아직 미완입니다.  
따라서 멀티트랙이 맞고, 이번 사이클의 우선순위는 `standalone 런치 안정화`입니다.

---

## 2) 다중 트랙 구조

### Track A — `ui-package` standalone 엔트리포인트화 (1순위)

`@workbench-kit/react`에서 외부 앱이 바로 Workbench를 조립할 수 있게 한다.

- 목표
  - `WorkbenchShell`(또는 `createWorkbenchShell`) 공개 API를 둔다.
  - story는 해당 엔트리포인트를 호출하는 fixture로 축소.
- 핵심 원칙
  - Story-only 데이터/임시 동작은 최소화
  - side-effect(저장, 삭제 확인, 알림, 영구저장)는 callback 주입
  - 서비스 생성은 앱/래퍼 레벨에서 주입

### Track B — standalone 런치 안정성 고정 (동시 진행)

`runtime/host/service` 경계를 운영 가능한 수준으로 마무리.

- 목표
  - dispose 중복 처리, listener 관리, 실패 격리
  - chat/chat cancel / patch / save 경로의 오류 격리
  - baseline 플로우 회귀 유지

### Track C — `vscode-extension` wrapper 패키지 정리 (차기)

`vscode-extension`를 공식 런치 래퍼로 전환

- 목표
  - `createWorkbenchExtensionRuntime`을 앱 부트스트랩 API로 문서+예시 정리
  - wrapper는 Track A/B의 공개 계약을 사용

## 3) 지금 당장 확인된 답(질문 답변 정리)

- **Workbench UI는 지금 화면에서 구현되었는가?**
  - **예.** `IntegratedWorkbenchShell` 기준 조립에서 Explorer/Search/Editor/Chat/Settings/Status가 모두 동작.
  - 근거 파일:
    - `packages/react/src/workbench/Workbench.stories.tsx`
    - `packages/react/src/workbench/WorkbenchShell.tsx`
    - `packages/react/src/workbench/WorkbenchShell.test.tsx`
  - 근거 실행:
- `pnpm test:storybook-play:required` (`storybook-play-required` 9개 pass)
- **지금 당장 extension 래퍼를 만들면 되는가?**
  - `packages/vscode-extension` API는 존재하고 타입/테스트도 통과(`typecheck`, `test` 모두 pass)이지만,
  - 현재 목표가 `standalone launch` 안정화라면 `Track C`는 문서/계획으로 넘기고 실제 코드 확장은 다음 사이클 권장.

```bash
pnpm --filter @workbench-kit/vscode-extension typecheck
pnpm --filter @workbench-kit/vscode-extension test
```

## 4) 최종 실행 로드맵(안정화 순서)

### 단계 1 (이번 사이클): App Entrypoint 추출 고정

1. `packages/react`에서 조립 책임을 분리하는 최소 public contract 확정(활동/상태/서비스/커맨드 바인딩)
2. downstream에서 추출된 command descriptor metadata와 sectioned layout을 기준 API로 유지
3. story는 fixture로 축소
4. 게이트:
   - `pnpm --filter @workbench-kit/react typecheck`
   - `pnpm test:storybook-play:required`

### 단계 2 (이번 사이클): 런타임/호스트 신뢰성 강화

1. `vscode-host` 구독 정리·예외 격리 경로 점검
2. `services` + `vscode-host`에 상태 오염 방지 회귀 테스트 추가/정리
3. 게이트:
   - `pnpm --filter @workbench-kit/vscode-host typecheck`
   - `pnpm --filter @workbench-kit/vscode-host test`
   - `pnpm --filter @workbench-kit/services typecheck`

### 단계 3 (다음 사이클): 공식 wrapper화

1. `packages/vscode-extension`를 Standalone Entry API에 맞춰 조립 가이드 정리
2. 기존 `WorkbenchExtensionRuntime`를 앱 엔트리와 매핑 가능한 형태로 문서화 및 샘플 앱 바인딩
3. 게이트:
   - `pnpm --filter @workbench-kit/vscode-extension typecheck`
   - `pnpm --filter @workbench-kit/vscode-extension test`
   - Track A/B baseline 회귀 미상실

---

## 5) Track A 세부 실행계획(세대 1)

### 3.1 공개 타입 계약 제안

```ts
export interface WorkbenchShellProps<TActivityId extends string = 'explorer' | 'search' | 'chat'> {
  activities: { id: TActivityId; label: string; icon?: string }[];
  initialFiles?: WorkspaceFile[]; // 기본 샘플 없음, 앱 주입 권장
  commandRegistry: CommandRegistry<WorkbenchShellCommandContext<TActivityId>>;
  initialActivityId?: TActivityId;
  onRuntimeError?: (error: Error) => void;
  onStatusMessage?: (message: string) => void;
  services: {
    chatService: WorkbenchChatService;
    saveService: WorkspaceSaveService;
    patchService: WorkspacePatchService;
  };
  workspaceController: {
    openFile: (path: string) => void;
    saveFile: (path: string, content: string, previousUpdatedAt?: string) => Promise<SaveResult>;
    deleteFiles: (paths: string[]) => void;
    // etc.
  };
}
```

### 3.2 코드 작업 단위

1. `packages/react/src/workbench/WorkbenchShell.tsx`(이미 추출된 레이아웃) 위에
   앱 조립용 entry wrapper/adapter 인터페이스를 정렬
2. story 내부의 `IntegratedWorkbenchShell` 조립 로직을 정렬한 엔트리포인트 호출형식으로 전환
3. `packages/react/src/workbench/index.ts`에 export 추가
4. story 상단 local 샘플 `WorkbenchShell` 이름과 충돌 제거

### 3.3 Track A 게이트

- `pnpm.cmd --filter @workbench-kit/react typecheck`
- `pnpm.cmd test:storybook-play:required`
- `packages/react/src/workbench/Workbench.stories.tsx` baseline flow 1:1 동작 유지

---

## 6) Track B 세부 실행계획

1. host/runtime 안정화

- `vscode-host` bridge 구독 해제/재구독 시나리오
- 중복 dispose 안전성 (idempotent)
- 메시지 송수신 실패 시 status/error path 분기

2. 서비스 단위 회귀 강화

- `chat` 취소 중 patch 이벤트 수신 시 상태 안정성
- `save` 실패 응답을 UI 상태와 분리된 결과로 처리
- `patch` 적용 실패시 후속 상태 오염 금지

3. Track B 게이트

- `pnpm.cmd --filter @workbench-kit/vscode-host typecheck`
- `pnpm.cmd --filter @workbench-kit/vscode-host test`
- `pnpm.cmd --filter @workbench-kit/services typecheck`
- `pnpm.cmd test:storybook-play:required`

---

## 7) Track C 세부 실행계획(차기)

1. wrapper 계약 정리

- `packages/vscode-extension` API를 Track A가 요구하는 생성자/어댑터 계약으로 정렬

2. 런타임 조립 가이드

- `Workbench` 조립 예시 1건
- command + runtime + services + plugin service 옵션

3. 게이트

- `pnpm --filter @workbench-kit/vscode-extension typecheck`
- `pnpm --filter @workbench-kit/vscode-extension test`
- 기존 `standalone` 경로와의 호환성 문서화

> 현재 사이클에서는 이 Track은 실행 대상이 아니며, `standalone` 안정화 완료 후 다음 마일스톤으로 이월한다.

---

## 8) 단계별 3주 계획(우선 실행)

### 1주차 (Track A 중심)

- `WorkbenchShell` 계약 확정 + 엔트리 컴포넌트 스켈레톤
- story baseline 회귀 확인

### 2주차 (Track B 중심)

- host/runtime/event failure 경로 테스트 보강
- 라이프사이클 해제/리스너 누수 회귀 보강

### 3주차 (준비 + Track C)

- `standalone` 트랙 결과 정리 및 `staging` 통합 검증 준비
- `vscode-extension`은 다음 마일스톤으로 이월 상태를 문서화

---

## 9) 위험·의사결정 포인트

1. **UI를 wrapper로 바로 감싸야 하는가, 아니면 Shell만 먼저?**  
   → 우선 Shell 먼저. wrapper는 Track C.
2. **서비스와 상태를 shell이 소유할지 앱이 소유할지**  
   → 상태는 shell 내부 제어, side-effect는 앱 주입.
3. **플러그인 lifecycle 선적용 범위**  
   → Track C 준비 단계에서 최소 범위부터(명령/기여 기초) 분리.

---

## 10) 브랜치/병합 운영 원칙

- `feature/codex/standalone-workbench-shell` 또는 현재 실행 브랜치(`feature/codex/standalone-app-launch-hardening`)의 Track A 파생 브랜치 (Track A)
- `feature/codex/standalone-runtime-hardening` 또는 위 브랜치 하위 파생 브랜치 (Track B)
- `feature/codex/vscode-extension-wrapper` (Track C, 다음 마일스톤)
- 다중 결과 통합 시 `staging`에서 병합 후 게이트 수행
- 단일 주제는 `--ff-only`, 다중 서브스트림은 `main` 병합 시 `--no-ff` 검토

---

## 11) 다음 단계 즉시 액션(현재 승인 필요 없음)

1. **지금 당장 실행할 PR 1개**: `WorkbenchShell` 조립 경계 설계안을 `docs/workbench/workbench-package-plan.md`의 9개 baseline 시나리오 기준으로 확정

- 산출물: `WorkbenchShell` 계약 표 (activity/context/서비스/사이드이펙트 callback)

2. **PR 2(분리)**: `Workbench.stories.tsx`에서 `IntegratedWorkbenchShell` 역할을 fixture/compose-only로 축소하고
   기존 baseline 필수 9개 + baseline 후보 18개(현재) 분리 유지
3. **PR 3(하드닝)**: `@workbench-kit/vscode-host`에서 `dispose` 중복/구독/오류 격리 회귀 테스트 보강
4. 각 PR은 게이트:
   - `pnpm --filter @workbench-kit/react typecheck`
   - `pnpm --filter @workbench-kit/vscode-host test`
   - `pnpm --filter @workbench-kit/services typecheck`
   - `pnpm test:storybook-play:required`
5. **통합 전환 규칙**: 현재 사이클에서 `vscode-extension` 소스 파일 수정 없음, `typecheck/test` 통과 상태만 상태표로 보관

## 12) 현재 사이클 실행 체크리스트 (권고)

### Track A 준비 완료 조건 (공개 진입점 추출)

- `@workbench-kit/react` 내 `WorkbenchShell`/`WorkbenchShellOptions` 초안 정의
- `Workbench.stories.tsx`에서 현재 통합 조립 로직을 새 엔트리포인트 호출 구조로 전환
- `packages/react/src/workbench/index.ts`에 공개 export 추가
- `pnpm --filter @workbench-kit/react typecheck` green

### Track B 준비 완료 조건 (standalone 런치 hardening)

- `packages/vscode-host` 구독/해제/재구독 경로에 대해 상태 격리 테스트 추가 또는 보강
- `WorkbenchChatService`/`WorkspacePatchService` callback 실패 격리 케이스 보강
- `pnpm --filter @workbench-kit/vscode-host typecheck` green
- `pnpm --filter @workbench-kit/services typecheck` green

### 공통 검증 게이트

- `pnpm test:storybook-play:required` green (`storybook-play-required` 9개)
- 현 브랜치에서 문서 갱신 상태(`migration-todo`, `subpackage-architecture`, `workbench-entrypoint-strategy`)와 일치 확인
- vscode-extension 소스 변경 없음 유지, `next milestone`로 이월 상태 문서 반영

## 13) Branch 운용/병합 원칙(현재 사이클)

- 작업 브랜치: `feature/codex/standalone-app-launch-hardening`
- 분기 단위는 Track A/B 기준으로 1개 주제 당 PR
- Track A/B 통합 전환은 `staging` 기준 브랜치로 병합, 최소 1회 게이트 통과 후 반영
- `vscode-extension` 관련 작업은 이 브랜치에서 시작하지 않음; 다음 마일스톤 브랜치로 이월
