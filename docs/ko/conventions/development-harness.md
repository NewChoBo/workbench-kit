# Development Harness

변경 surface에 맞는 가장 좁은 검증 레인을 선택한다. 실행하지 않은 검증은 통과한
것처럼 보고하지 않는다.

영어 [Development Harness](../../conventions/development-harness.md)가 canonical 문서입니다.

## Validation Lanes

| 변경 surface                        | 최소 검증                                           | 확장 검증                                       |
| ----------------------------------- | --------------------------------------------------- | ----------------------------------------------- |
| workspace, package export, lockfile | `pnpm validate`                                     | 공개 경계 검색                                  |
| `packages/tokens` CSS 변수          | `pnpm validate`                                     | 샘플 또는 Storybook 시각 확인                   |
| `packages/react` primitive          | `pnpm --filter @newchobo-ui/react typecheck`        | `pnpm validate`, 브라우저 smoke                 |
| `examples/react-sample`             | `pnpm --filter @newchobo-ui/react-sample typecheck` | `pnpm --filter @newchobo-ui/react-sample build` |
| Storybook 설정 또는 stories         | `pnpm build:storybook`                              | interaction test, 브라우저 smoke                |
| lint/format 설정                    | `pnpm lint && pnpm format:check`                    | `pnpm validate`                                 |
| README, conventions                 | 수동 문서 검토                                      | 공개 경계 검색                                  |

## 보고

커밋 본문과 release-facing 보고는 영어로 남긴다.

```text
Validation: pnpm validate passed.
Validation: Public-boundary search passed.
```
