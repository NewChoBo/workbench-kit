# Lint & Format

ESLint handles code-quality checks. Prettier handles code shape. Keep their
responsibilities separate. TypeScript safety is covered by both `tsc` and
`typescript-eslint`.

## Tooling

- ESLint: TypeScript/TSX static analysis
- typescript-eslint: TypeScript parser and recommended rule set
- Prettier: TS, TSX, CSS, JSON, and Markdown formatting
- eslint-config-prettier: prevents formatting-rule conflicts between ESLint and Prettier

Do not use TSLint. TSLint is deprecated, and TypeScript linting should use
`typescript-eslint`.

## Commands

```powershell
pnpm lint
pnpm lint:fix
pnpm format:check
pnpm format
```

`pnpm validate` runs typecheck, lint, format check, and sample build together.

## Rules

- Formatting differences are resolved by Prettier.
- ESLint checks unused variables, incorrect type imports, and general TS/JS risks.
- Type-only imports use `import type` or inline type imports.
- Variables and parameters starting with `_` are considered intentionally unused.

## Formatting

Keep most Prettier defaults, with these explicit settings:

- `endOfLine`: auto
- `printWidth`: 100
- `singleQuote`: true
- `trailingComma`: all
