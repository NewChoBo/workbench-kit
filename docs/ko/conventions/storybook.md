# Storybook Direction

Storybook은 컴포넌트 단위 문서화와 상태 매트릭스 확인을 담당한다. 샘플 앱은 실제
조합 smoke 용도로 유지한다.

영어 [Storybook Direction](../../conventions/storybook.md)가 canonical 문서입니다.

## 초기 stories 순서

1. `Badge`, `Button`, `IconButton`
2. `TextInput`, `Select`, `Checkbox`, `Field`
3. `Panel`, `SideBarViewFrame`
4. `ActivityBar`, `SplitView`
5. `ConfirmDialog`, `ContextMenu`

각 story는 dark/light 배경에서 확인 가능해야 하고, private 업무 데이터 대신 범용
UI 문구만 사용한다.
