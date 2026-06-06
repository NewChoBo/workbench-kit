# 라이브러리 런치맵핑 공통 마이그레이션 런북 (2차)

목적

- `custom_launcher`와 `tile_paper`에서 라이브러리 실행 규약을
  `@workbench-kit/contracts` 단일 규격으로 이행한다.
- 앱별 중복 로직(`launchTarget` 판정, workingDirectory 계산, 위젯 이벤트 타입)을 제거한다.

적용 대상

- `custom_launcher` 경로: 라이브러리 실행 판단/실행 바인딩/라이브 라이브 바인딩 갱신
- `tile_paper` 경로: provider-library 액션 라벨/아이콘/payload 및 JSON 위젯 렌더러 계약

실행 원칙

1. UI 렌더링 책임은 앱에 남긴다.
2. 데이터/규칙 책임은 `@workbench-kit/contracts`로 일원화한다.
3. 변경은 “동작 동등성” 게이트를 통과한 뒤만 반영한다.

### 사전 점검

- `@workbench-kit/contracts` 공개 API가 import 가능한지 확인:
  - `createLaunchpadLibraryItemTileBinding`
  - `normalizeLaunchTarget`
  - `inferLaunchTypeFromTarget`
  - `resolveLaunchpadLibraryItemMapping`
  - `WidgetRendererComponent`, `WidgetRendererProps`
- 공통 규칙 테스트 존재 확인:
  - `[C] library-launchpad-mapping.test.ts`에서 아래를 모두 다루고 있는지
    - `app/file/folder/url` 타입 분기
    - `trim + case-preserve` 동작
    - 빈 값 비가동성 규칙
    - 바인딩 payload 항목 존재

### 체크리스트: custom_launcher

예시 치환 스니펫(컨셉):

```ts
// before
import { detectLaunchType, deriveWorkingDir, isValidLaunchTarget } from 'shared/launch-target';

// after
import {
  canMapLibraryItemToLaunchpadTile,
  inferLaunchTypeFromTarget,
  resolveLaunchpadLibraryItemMapping,
  normalizeLaunchTarget,
} from '@workbench-kit/contracts';
```

```ts
// before
const executable = item.launchTarget ? item.launchTarget.trim() : null;
const launchType = isValidLaunchType(executable) ? computeType(executable) : null;

// after
const mapping = resolveLaunchpadLibraryItemMapping(item);
const execution = mapping.execution;
const canLaunch = mapping.canLaunch;
```

1. 런치 실행 경로 정렬
   - 이전: 로컬 `launch-target` 유틸 또는 consumer 전용 파싱 로직
   - 변경: `inferLaunchTypeFromTarget`, `deriveLaunchWorkingDirectory`, `normalizeLaunchTarget`,
     `resolveLaunchpadLibraryItemMapping` 기준으로 계산
2. 라이브 바인딩/스냅샷 바인딩 매핑 정합성
   - `resolveLaunchpadLibraryItemMapping().execution`이
     실행 요청 target, launchType, workingDirectory를 동일하게 생성하는지 확인
3. open location/작업 경로 전달 규칙
   - sourcePath, workingDirectory, target는 값 정규화/치환 중복 없이 계약 규칙 그대로 전달

### 체크리스트: tile_paper

예시 치환 스니펫(컨셉):

```ts
// before
import { getProviderActionLabel, getProviderActionIcon } from 'consumer/provider-model';

// after
import { resolveLaunchpadLibraryItemMapping } from '@workbench-kit/contracts';
```

1. 라이브러리 액션 라벨/아이콘
   - `providerActionLabel`, `providerActionIcon` 파생 로직이 규약된 계약을 호출하는지 확인
2. 렌더러 payload
   - JSON widget event/shape가 `WidgetRendererProps` 기반으로 일관되게 구성되는지 확인
3. 런치 액션 payload 생성
   - tile payload(launchType/target/workingDirectory/arguments)가 계약 규약을 따르는지 확인

### Acceptance checks (consumer-side 최소 기준)

- 테스트 샘플 1개당 다음 값 비교
  - `launchType`: app/url/file/folder
  - `execution.target`: trim 이후 값, 비어있으면 `null`
  - `workingDirectory`: app 실행 시 계산, 기타 `null`
  - `arguments`: 계약 기본값을 준수
  - `subtitle`: 중복 제거된 값 합성
  - `canLaunch`: 빈/공백 target이면 `false`, 값이 있으면 `true`
- UI 렌더러 이벤트 타입은 `press`/`change`로 고정

### 마이그레이션 후 가드

- custom_launcher/tile_paper 내부 `shared` 런치 판정/normalize 함수 직접 구현 폐기
- 규격 변경 필요 시 `@workbench-kit/contracts`만 수정하고 소비측은 동등성 테스트만 갱신

## 적용 패치 템플릿 (Downstream 붙여넣기)

아래 패치 템플릿은 개념 예시이며, 대상 저장소 경로/심볼명은 실제 위치에 맞춰 치환해 사용한다.

### A. custom_launcher 적용 템플릿

1. 런치매핑 import 교체

```diff
@@
-import { detectLaunchType, deriveWorkingDirectory, normalizeLaunchInput } from 'shared/launch-target';
+import {
+  canMapLibraryItemToLaunchpadTile,
+  normalizeLaunchTarget,
+  resolveLaunchpadLibraryItemMapping,
+} from '@workbench-kit/contracts';
```

2. 실행 요청 계산 지점 정규화

```diff
@@
-const target = item.launchTarget?.trim() ?? null;
-const launchType = target ? detectLaunchType(target) : null;
-const workingDirectory = launchType === 'app' ? deriveWorkingDirectory(target) : null;
-const canLaunch = !!target;
-
-return {
-  target,
-  launchType,
-  workingDirectory,
-  canLaunch,
-};
+const mapping = resolveLaunchpadLibraryItemMapping(item);
+const { canLaunch, execution } = mapping;
+const { target, launchType, workingDirectory } = execution;
```

3. 실행 요청 검증 테스트 추가

```ts
import { resolveLaunchpadLibraryItemMapping } from '@workbench-kit/contracts';

it('maps launch request through contracts', () => {
  const mapped = resolveLaunchpadLibraryItemMapping({
    itemId: 'm-1',
    launchTarget: ' C:/Games/Example/App.exe ',
  });
  expect(mapped.canLaunch).toBe(true);
  expect(mapped.execution.target).toBe('C:/Games/Example/App.exe');
  expect(mapped.execution.launchType).toBe('app');
  expect(mapped.execution.workingDirectory).toBe('C:/Games/Example');
});
```

### B. tile_paper 적용 템플릿

1. 라이브러리 액션 파생 규칙을 공통 mapping으로 정렬

```diff
@@
-import { providerActionIcon, providerActionTypeLabel } from './legacy-provider-library';
+import { resolveLaunchpadLibraryItemMapping } from '@workbench-kit/contracts';
```

2. provider action/args 생성 시 계약 기반 필드만 사용

```diff
@@
-const launchType = parseLaunchType(item.launchTarget);
-const cwd = computeWorkingDirectory(launchType, item.launchTarget);
-return { launchType, cwd, arguments: [] };
+const execution = resolveLaunchpadLibraryItemMapping(item).execution;
+return {
+  launchType: execution.launchType,
+  cwd: execution.workingDirectory,
+  arguments: execution.arguments,
+  target: execution.target,
+};
```

3. JSON 위젯 renderer 이벤트 타입 통일

```diff
@@
-type WidgetRendererEvent = { kind: 'on-change' | 'on-press'; payload?: string };
+import type { WidgetRendererEvent, WidgetRendererEventKind } from '@workbench-kit/contracts';
```

## 빠른 수용 점검 (스크립트형)

```powershell
pnpm --filter @workbench-kit/contracts typecheck
git -C <consumer-repo> diff --stat
pnpm --filter <consumer-package> test -- <target-launch-tests>
```

### 체크 항목(문서 업데이트까지 같이 마감)

- [ ] 위임 계약 함수 호출부가 `shared/*`에서 직접 판별 로직으로 전환되지 않았는지 확인
- [ ] launchTarget trim/정규화가 계약에서 한 번만 수행되는지 확인
- [ ] `launchType`, `workingDirectory`, `arguments`, `subtitle`, `canLaunch` 동등성 비교 테스트 1건 이상 추가
- [ ] `WidgetRendererEventKind`(`press`/`change`) 사용만 남았는지 확인
