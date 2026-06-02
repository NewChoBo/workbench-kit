# Git Workflow

공개 UI 패키지는 `main`을 항상 검증 가능한 기준선으로 두고, 실제 작업은 짧은
브랜치에서 진행한다. 브랜치 안에서는 논리 커밋을 남기고, 합병 전에는 검증 결과와
공개 경계를 확인한다.

영어 [Git Workflow](../../conventions/git-workflow.md)가 canonical 문서입니다.

## 핵심 규칙

- `main`은 릴리스 가능한 기준선으로 유지한다.
- 작업 브랜치 이름은 `<lane>/<owner-or-scope>/<topic>` 형식을 쓴다.
- 예: `feature/codex/chatting-ui`, `chore/storybook/react-vite-baseline`
- 기본 병합 방식은 `git merge --ff-only`다.
- squash는 실험/fixup 커밋이 많을 때 사용한다.
- merge commit은 통합 이벤트 자체를 기록할 가치가 있을 때만 남긴다.
- 여러 작업을 동시에 할 때는 `git worktree`로 workspace를 분리한다.

## Commit Message

새 커밋 메시지는 영어 Conventional Commits를 사용한다.

```text
feat(react): normalize dialog primitive state

Connect Modal and ConfirmDialog title ids so dialog accessible names cannot be
omitted accidentally.

Validation: pnpm --filter @newchobo-ui/react typecheck passed.
```

과거 커밋은 언어 변경만을 위해 rewrite하지 않는다.
