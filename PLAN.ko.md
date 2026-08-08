# Workbench Kit — 작업 계획

> 현재 상태·우선순위 정본. 상세 소비 API는
> [`consumer-capabilities.md`](./docs/workbench/consumer-capabilities.md), 구조는
> [`current-state.md`](./docs/workbench/current-state.md)를 따른다.

**갱신:** 2026-08-08

## 목표

Workbench Kit은 Android Studio·VS Code 계열의 작업 구조를 제품 중립적으로 제공한다.
Activity Bar, Tool Window, Editor tab, Panel, command/search, 상태복원, 설정과 extension
runtime이 중심이다. JDW·Field Remap은 이 shell 위에 얹는 선택 capability이며 전체 구조의
기준축이 아니다.

| Kit 소유                                              | Host 소유                                        |
| ----------------------------------------------------- | ------------------------------------------------ |
| shell/layout · view/panel · command/search · settings | 제품 route · 도메인 데이터 · IPC/filesystem      |
| 상태 adapter 계약 · extension registry/lifecycle      | user-data 저장 · trust · marketplace · 권한 정책 |
| 공통 UI · keyboard/a11y · empty/error/progress        | 제품 카피 · 분석 · 외부 실행 효과                |

## 완료 기준선

- shell layout, Activity Bar, primary/auxiliary Tool Window, Panel, Editor tab, status bar
- command palette, Quick Open, keybinding/context key, layout/editor/settings 상태 adapter
- workspace/editor/explorer와 extension registry·activation·install-state
- theme/i18n 주입, settings/management, JDW·Field Remap 선택 surface
- npm exact cohort, 외부 packed TypeScript 소비 및 production bundle 검증
- `WorkbenchProvider`의 명시적 extension inventory; built-in은 공개, sample은 저장소 전용

## Now — P0

1. **소비 경계 완결:** leaf export와 dependency graph를 유지하고 source-only 배포가 소비자
   compiler 옵션을 강제하는 영역을 찾아 JS + declaration 배포 전환안을 작은 패키지부터 검증한다.
2. **작업 구조 수렴:** Tool Window 열기/숨기기·이동, Panel, Editor tab, Focus를 동일 command와
   layout state 계약으로 연결한다.
3. **탐색 수렴:** command palette와 Quick Open을 하나의 keyboard-first 진입점에서 조합하되
   검색 데이터와 제품 행동은 host provider가 소유한다.
4. **복원·회복:** 최근 작업, layout, selection을 host adapter로 복원하고 누락 대상·손상 상태는
   명시적 empty/error action으로 복구한다.
5. **실소비 게이트:** 공개 root와 leaf import를 실제 npm tarball로 typecheck/build하고, 무관한
   Monaco/JDW/Field Remap이 초기 정적 chunk에 들어오지 않게 유지한다.

## Next — P1

- 다중 Tool Window와 editor group의 keyboard 이동·focus history
- task/progress/notification와 Timeline 표시 primitive
- settings 검색·scope·reset, extension enable/disable 진단과 host storage 실패 회복
- 200% zoom, reduced motion, screen-reader 이름과 키보드 전용 주요 흐름 검증

## Later

- JDW Spec/Form 확장은 실제 두 번째 소비 시나리오가 생길 때 재개
- remote extension catalog·AI transport는 host trust/권한 계약이 먼저 확정될 때 진행
- split editor 고급 기능, 다중 workspace는 기본 작업 흐름이 측정 기준을 충족한 뒤 확장

## 하지 않음

제품 도메인 모델·Electron IPC·사용자 파일 형식·marketplace trust를 Kit에 넣지 않는다.
숨은 built-in 기본값, sample 자동 포함, host별 adapter 복제, JDW 중심 shell 재편도 하지 않는다.

## 릴리스 체크리스트

포맷 → 린트 → 타입 → 관련 테스트/빌드 → packed 실제 소비 → 소스 증감·중복 검토 →
`git status` 확인 → 정확한 커밋 전체 `pnpm validate` → tag/publish → npm cohort 확인.
