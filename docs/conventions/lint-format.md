# Lint & Format

코드 품질 검사는 ESLint, 코드 모양 정리는 Prettier가 담당한다. 두 도구의 책임을
섞지 않고, TypeScript 타입 안정성은 `tsc`와 `typescript-eslint`가 나누어 본다.

## Tooling

- ESLint: TypeScript/TSX 정적 분석
- typescript-eslint: TypeScript parser와 recommended rule set
- Prettier: TS, TSX, CSS, JSON, Markdown formatting
- eslint-config-prettier: ESLint와 Prettier의 formatting rule 충돌 방지

TSLint는 사용하지 않는다. TSLint는 deprecated 상태이고, TypeScript lint는
`typescript-eslint`로 통합하는 것이 현재 기준이다.

## Commands

```powershell
pnpm lint
pnpm lint:fix
pnpm format:check
pnpm format
```

`pnpm validate`는 typecheck, lint, format check, sample build를 함께 실행한다.

## Rules

- formatting 차이는 Prettier로 해결한다.
- ESLint는 unused variable, 잘못된 type import, 일반적인 TS/JS 위험 신호를 본다.
- import가 타입 전용이면 `import type` 또는 inline type import를 쓴다.
- `_`로 시작하는 변수와 인자는 intentionally unused로 간주한다.

## Formatting

Prettier 기본값을 대부분 유지하되 다음만 명시한다.

- `printWidth`: 100
- `singleQuote`: true
- `trailingComma`: all
