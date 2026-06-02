# Lint & Format

코드 품질 검사는 ESLint, 코드 모양 정리는 Prettier가 담당한다. 두 도구의 책임을
섞지 않는다.

영어 [Lint & Format](../../conventions/lint-format.md)가 canonical 문서입니다.

## Tooling

- ESLint: TypeScript/TSX 정적 분석
- typescript-eslint: TypeScript parser와 recommended rule set
- Prettier: TS, TSX, CSS, JSON, Markdown formatting
- eslint-config-prettier: ESLint와 Prettier의 formatting rule 충돌 방지

TSLint는 사용하지 않는다. TSLint는 deprecated 상태이고, TypeScript lint는
`typescript-eslint`를 사용한다.

## Commands

```powershell
pnpm lint
pnpm lint:fix
pnpm format:check
pnpm format
```
