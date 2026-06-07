# Library Launch Boundary Gate

이 문서는 `@workbench-kit/contracts` 우선 경계가 유지되었는지 확인하는 최소 게이트입니다.

## Gate 목적

- 런치 정책 정규화 로직(`normalize`, `infer`, `workingDirectory` 판정)이 소비자 앱 런타임에서 중복 구현되지 않도록 한다.
- `#shared/launch-target` 및 legacy 보조 함수를 shim 범위로 고정한다.

## Gate Checks

1. 런타임 경로에서 정책 직접 호출 검색

실행:

```powershell
rg -n "#shared/(launch-target|launchpads/launchpad-library-mapping)|\\bdetectLaunchType\\b|\\bnormalizeLaunchInput\\b|\\bisValidLaunchTarget\\b" .\custom_launcher\main .\tile_paper\apps .\tile_paper\packages --glob "!**\*.test.ts" --glob "!**\*.test.tsx" --glob "!**\*.spec.ts"
```

또는 공통 실행 스크립트:

```powershell
pnpm check:launch-boundary
```

합격 조건:

- `custom_launcher\main`에서 런치 정책 판단(`infer`, `workingDirectory`)은
  계약 진입점 위임(`@workbench-kit/contracts` 또는 `#workbench-kit/*`) 또는
  허용된 shim(`custom_launcher/shared/launch-target.ts`)에서만 수행되어야 한다.
- `tile_paper` 런타임/모듈 경로에서 legacy import가 직접 나타나지 않아야 한다.

2. shim 사용 허용 범위 제한

허용:

- `custom_launcher/shared/launch-target.ts` (호환 API 유지)
- `custom_launcher/tests/unit/shared/launch-target.test.ts` (shim 동작 회귀)
- `custom_launcher/main`/`renderer` 진입점의 adapter 또는 바인딩 래퍼에서의 재내보내기.
- `custom_launcher/tests/unit/launchpad/authoring/launchpad-data-binding.test.ts` (legacy helper 결과치 추적)
- `custom_launcher/tests/**/*.test.ts` (legacy/브릿지 동작 회귀)

금지:

- `custom_launcher/main`, `renderer`, `packages` 런타임 경로의 신규 정책 로직 구현
- `tile_paper` 런타임 경로에서 자체 launch 유추/trim/derive 구현
- legacy 헬퍼 함수를 사용한 정책 구현 (`detectLaunchType`, `normalizeLaunchInput`, `isValidLaunchTarget`, `deriveLaunchWorkingDirectory`)의 재도입

추가 금지 항목:

- `#shared/launchpads/launchpad-library-mapping`의 런타임 직접 import

3. 이벤트 규약 준수

- `press` / `change` 이외 값이 렌더 바인딩 이벤트로 새로 유입되지 않아야 한다.
- 출력 이벤트는 `WidgetRendererEvent` contract를 기준으로 정규화 후 소비한다.

## Closure Condition

- 위 세 항목이 충족되면 Phase 2 boundary gate는 통과.
- 미충족 항목은 Phase 2 마일스톤 다음 PR에서 우선순위로 환원.

추가: PR/리뷰 체크리스트

- `library-launch-boundary-review-checklist.md`에 이 문서의 게이트 체크 결과를 첨부한다.
