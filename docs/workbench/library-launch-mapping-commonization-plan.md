# 라이브러리 런치맵핑 공통화 1차 실행 계획

목표

- UI 바인딩과 무관한 라이브러리 런치맵핑 규칙을 `@workbench-kit/contracts`에 수렴한다.
- `custom_launcher`와 `tile_paper`는 즉시 동일 규격 타입을 사용하도록 1차 마이그레이션한다.

현재 상태 (2026-06-06)

- `@workbench-kit/contracts`에 공통형 라이브러리 타깃 판정/매핑 API 추가:
  - 타깃 정규화/타입 추론
  - 런치 실행 정보 생성
  - 서브스트링 기반 subtitle 생성
  - 바인딩 페이로드 생성 보조 함수
- `packages/contracts/src/library-launchpad-mapping.test.ts`로 계약 동작을 고정.
- `custom_launcher`의 핵심 실행 경로에서 launch target 판정·워킹 디렉토리 계산을 `#workbench-kit/library-launchpad-mapping`으로 위임해 `shared/launch-target` 의존을 제거.
- `tile_paper`의 라이브러리 액션 라벨/아이콘/런치 payload 변환을 `@tilepaper/workbench-kit` 경유로 정렬.

적용 순서

1. `custom_launcher`

- `shared/launchpads/launchpad-library-mapping.ts`를 thin re-export로 바꾸어 중복 로직 제거
- `main/features/...` 런치 실행 경로에서 `#shared/launch-target` 직접 유틸 대신 `#workbench-kit/library-launchpad-mapping` 직접 호출
- `tests/unit/launchpad/authoring/launchpad-library-mapping.test.ts`에서 계약 동등성 회귀 비교 고정

2. `tile_paper`

- `apps/web-editor/src/provider-library/provider-library-model.ts`에서 `providerAction*` 계약 함수를 공통화
- JSON 기반 렌더러 계약 정렬 상태 점검

공통 검증

- 기존 입력 데이터로 mapping/subtitle/workingDirectory 결과 동등성 유지 확인
- 런치 패턴별 `launchType`/`workingDirectory` 회귀 (exe, url, folder, file) 고정
- 아이콘/라벨/결과 payload 동등성 테스트 반영

현재 완료 상태

- `custom_launcher`:
  - `library-item-action-service.ts`, `launchpad-execution-gateway.ts`의 실행 로직이 `workbench-kit/library-launchpad-mapping`을 사용하도록 변경됨.
  - `tests/unit/launchpad/authoring/launchpad-library-mapping.test.ts`에서 `#shared/launchpads/launchpad-library-mapping`와 `#workbench-kit/library-launchpad-mapping` 동등성 비교됨.
- `tile_paper`:
  - `provider-library-model.ts`의 `providerActionIcon`, `providerActionTypeLabel`은 로컬 구현을 제거하고 workbench-kit 헬퍼를 경유.
  - `provider-library-model.test.ts`에 공통 결과 동등성 + args 복사 정책 검사 추가.

수용 기준

- 신규 공통 API export가 안정화되고 최소 1개 소비 모듈에서 참조됨
- custom launcher 핵심 경로에서 중복 코드가 제거된 상태로 빌드 가능
- tile_paper 어댑터에서 회귀 없는 공통 계약 소비 상태 유지

다음 스탭

1. `custom_launcher` 런치타겟/실행 계약 회귀를 소수 샘플로 스냅샷 기반으로 재확인(향후 브랜치 기준 회귀 지표로 활용)
2. `tile_paper` `json-widget-tree-react` 경계 재점검 및 필요 시 데이터 계약 분리 작업 이어가기

## 데이터 처리 패키지 분리 판단 (UI 패키지와 분리 전략)

권장 방향:

- 공통 로직의 핵심은 `@workbench-kit/contracts` 안에 유지한다.
- `custom_launcher`/`tile_paper` UI를 대상으로 한 런처 렌더링, provider model, 명령 바인딩은 각 앱(또는 별도 어댑터 패키지)에서 소비한다.
- `UI 전용 패키지`(`@workbench-kit/react`)는 **렌더링과 컴포즈 훅**만 담당하고, `데이터 정규화/런치 추론/바인딩 규격`은 `@workbench-kit/contracts`에서 단일화한다.

판단 근거:

- 동일 규격(launch target 정규화, launchType 추론, workingDirectory 계산)을 UI 외부에서 고정해야
  `custom_launcher`와 `tile_paper`의 실행 정책이 분기 없이 동등해진다.
- 계약형 타입을 contracts에 두면, 소비측은 UI 스타일/컴포넌트 선택에만 집중하고 런치 처리 정책 재작성 비용을 줄일 수 있다.
- 현재 모듈 구조상 데이터 변환이 필요한 추가 범위(예: JSON 위젯 렌더러 payload 정규화)는 `@workbench-kit/contracts` 또는
  `@workbench-kit/adapters`에 배치하는 것이 자연스럽다.

다음 단계 제안:

1. `contracts`에 `launchpad` 규칙 회귀 테스트를 1차 완료 후, `custom_launcher/tile_paper` 소비 가이드 문장을 각각의 adapter 경로에 삽입.
2. `tile_paper`의 JSON 위젯 렌더러 경로는 data parsing/validation 규격을 먼저 정리한 뒤 `@workbench-kit/contracts`로 회귀 기준만 노출.
3. 공통 정책이 고정되면 다음 마일스톤에서 `consumer migration` 브랜치 기준으로 `shared` 로컬 유틸 완전 제거를 강제.
4. 실행 체크리스트는 [library-launch-migration-runbook.md](./library-launch-migration-runbook.md)로 즉시 이관해
   다운스트림 PR에서 바로 적용한다.

### 공통 경계 체크리스트(구현 전/후)

- 계약 단위
  - `resolveLaunchpadLibraryItemMapping`, `createLaunchpadLibraryItemTileBinding`, `normalizeLaunchTarget`는 소비 패키지에서 import 해석이 단일화되어야 한다.
  - `WidgetRenderer*` 타입은 렌더러 정책보다 계약 타입으로 고정된 최소한의 이벤트/shape 정의로 사용한다.
- 소비 패턴 점검
  - `launchTarget` 정규화(`trim`)는 어디서도 중복 구현되어선 안 되며, 입력 경로는 계약 호출 지점에서만 정규화한다.
  - `sourcePath`/`arguments`/`workingDirectory` 파생 규칙이 UI 상태 변경으로 재해석되지 않도록 한다.
- migration 조건
  - `custom_launcher`: `shared/*` 내부의 런치 판정 유틸이 사용되지 않을 것
  - `tile_paper`: 라이브러리 액션 라벨/아이콘 및 payload 생성은 공통 계약 또는 어댑터 유틸을 통과할 것
- 관측/회귀
  - 회귀는 실행타입(url/app/file/folder), 작업경로(workingDirectory), 비어있는 타깃 처리, subtitle 정렬, 바인딩 페이로드로 나눈다.
