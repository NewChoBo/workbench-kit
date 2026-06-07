# Library Launch Boundary PR Review Checklist

이 체크리스트는 Phase 2 종료 또는 `custom_launcher`/`tile_paper` 런치-공통화 PR에서 사용한다.

## 1) 실행 가드

- [ ] `pnpm check:launch-boundary` 실행 및 통과
- [ ] 실패 로그가 있다면 다음 중 어디에도 `legacy-launch-detector` 패턴이 남지 않았는지 근거 제시

기대 실행:

```powershell
pnpm check:launch-boundary
```

## 2) 공유 정책 사용 확인

- [ ] 런치 정책 계산이 `@workbench-kit/contracts` 또는 `#workbench-kit/*`를 통해 수행됨
- [ ] `custom_launcher/shared/launch-target.ts`는 shim 계약(하위 호환) 용도로만 유지
- [ ] 런처/라이브러리 경로에서 `#shared/launch-target` 또는 `#shared/launchpads/launchpad-library-mapping` 직접 import 없음

허용 패턴(예외):

- [ ] 테스트 패턴: `custom_launcher/tests/**/*.test.ts(x)`
- [ ] shim 파일: `custom_launcher/shared/launch-target.ts`

## 3) 이벤트 계약 준수

- [ ] widget 바인딩 이벤트가 `press`/`change`만 사용
- [ ] legacy 이벤트를 받아도 `normalizeWidgetRendererEvent`로 정규화 후 소비

## 4) 증빙 첨부

- [ ] 위반 건(있다면) 없으면 `Passed` 로그를 PR에 첨부
- [ ] 위반 건이 있으면 파일/라인, 원인, 대체 패치(계약/테스트)까지 첨부

## 5) 문서 동기화

- [ ] 변경 내용이 `library-launch-migration-runbook.md`의 해당 단계와 일치
- [ ] 변경이 `library-launch-boundary-gate.md`에 반영/추가됨
