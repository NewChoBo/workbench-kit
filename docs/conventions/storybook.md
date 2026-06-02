# Storybook Direction

Storybook은 컴포넌트 단위 문서화와 상태 매트릭스 확인을 담당한다. 샘플 앱은
실제 조합 smoke 용도로 유지하고, Storybook은 primitive와 layout component를
작게 분리해 보여준다.

## Recommended Shape

- 루트 `.storybook`을 둔다.
- framework는 `@storybook/react-vite`를 쓴다.
- stories는 `packages/react/src/**/*.stories.tsx`와 `stories/**/*.stories.tsx`를
  모은다.
- workspace package는 Vite alias로 source entry에 연결한다.
- `examples/react-sample`은 통합 샘플로 유지한다.

## Initial Stories

초기 stories는 다음 순서로 추가한다.

1. `Badge`, `Button`, `IconButton`
2. `TextInput`, `Select`, `Checkbox`, `Field`
3. `Panel`, `SideBarViewFrame`
4. `ActivityBar`, `SplitView`
5. `ConfirmDialog`, `ContextMenu`

각 story는 dark/light 배경에서 확인 가능해야 하고, private 업무 데이터 대신
범용 UI 문구만 사용한다.

## Scripts

Storybook을 추가하면 루트 스크립트는 다음 형태를 기본으로 한다.

```json
{
  "storybook": "storybook dev --port 6010 --host 127.0.0.1 --no-open",
  "build:storybook": "storybook build"
}
```

초기에는 `build:storybook`을 별도 검증으로 두고, stories가 안정화된 뒤
`validate`에 포함할지 결정한다.

## Interaction Tests

상호작용 테스트는 모든 story에 한꺼번에 붙이지 않는다. 먼저 접근성 위험이 큰
컴포넌트부터 시작한다.

- `ConfirmDialog`: 열림, accessible name, confirm/cancel
- `Checkbox`: checked state
- `Select`: value 변경
- `ContextMenu`: 열림, menuitem 선택, 닫힘
