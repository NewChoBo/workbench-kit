# Development Harness

검증은 변경 surface에 맞춰 가장 좁은 레인부터 고른다. 실행하지 않은 검증은
성공한 것처럼 말하지 않고, 최종 보고와 커밋 본문에 실행 명령을 남긴다.

## Validation Lanes

| 변경 surface | 최소 검증 | 확장 검증 |
| --- | --- | --- |
| workspace, package export, lockfile | `pnpm validate` | 공개 경계 검색 |
| `packages/tokens` CSS 변수 | `pnpm validate` | 샘플 또는 Storybook 시각 확인 |
| `packages/react` primitive | `pnpm --filter @newchobo-ui/react typecheck` | `pnpm validate`, 브라우저 smoke |
| `examples/react-sample` | `pnpm --filter @newchobo-ui/react-sample typecheck` | `pnpm --filter @newchobo-ui/react-sample build` |
| Storybook 설정 또는 stories | `pnpm build:storybook` | interaction test, 브라우저 smoke |
| README, conventions | 수동 문서 검토 | 공개 경계 검색 |

## UI Smoke

UI 변경은 가능한 한 실제 브라우저에서 확인한다.

- 주요 컴포넌트가 렌더링되는가?
- 부모 컨테이너 밖으로 text/input/button이 넘치지 않는가?
- dialog, menu, form control의 accessible name이 있는가?
- 클릭, 체크, 선택, 닫기 같은 기본 상호작용이 동작하는가?
- public sample에 private 제품 지식이나 내부 예제 데이터가 들어가지 않았는가?

## Reporting

최종 보고와 커밋 본문에는 다음을 남긴다.

```text
검증: pnpm validate 통과.
검증: 브라우저 smoke에서 ActivityBar, SplitView, ConfirmDialog 렌더링 확인.
검증: 공개 경계 검색 통과.
```

검증이 실패하면 제품 결함, 테스트 결함, 환경 결함 중 어느 쪽인지 먼저 분류한다.

