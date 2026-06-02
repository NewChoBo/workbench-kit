# Git Workflow

공개 UI 패키지는 `main`을 항상 검증 가능한 기준선으로 두고, 실제 작업은 짧은
브랜치에서 진행한다. 브랜치 안에서는 논리 커밋을 남기고, 합병 전에는 검증 결과와
공개 경계를 확인한다.

## Branches

### main

- 릴리스 가능한 기준선으로 유지한다.
- 직접 실험 작업을 하지 않는다.
- 합병 전 `pnpm validate`를 통과시킨다.
- 공개 패키지에 private 제품명, 고객명, 서버 주소, credential, 비공개 경로가
  섞이지 않았는지 확인한다.

### 작업 브랜치

브랜치명은 다음 형식을 쓴다.

```text
<lane>/<owner-or-scope>/<topic>
```

- `lane`: `feature`, `fix`, `refactor`, `docs`, `chore`, `test`
- `owner-or-scope`: `codex`, `react`, `tokens`, `sample`, `storybook`, `docs`, `release`
- `topic`: kebab-case 한두 단어 또는 짧은 구

예시:

```text
feature/codex/chatting-ui
feature/react/dialog-positioning
docs/codex/workflow-conventions
chore/storybook/react-vite-baseline
fix/react/modal-accessible-name
```

`codex`는 Codex가 맡아 진행하는 작업 브랜치에 쓴다. 패키지 소유권이 더 중요한
경우에는 `react`, `tokens`, `storybook`처럼 실제 변경 surface를 scope로 쓴다.

## Work Loop

```powershell
git switch main
git pull --ff-only
git switch -c feature/codex/chatting-ui
```

1. 작업 브랜치를 만든다.
2. 변경 surface를 좁게 유지한다.
3. 논리 단위별로 커밋한다.
4. 각 커밋에는 본문을 작성한다.
5. 합병 전 선택한 검증 명령을 실행한다.
6. private 지식이나 내부 예제 데이터가 공개 소스에 남지 않았는지 확인한다.
7. `main`으로 fast-forward merge한다.

```powershell
git switch main
git merge --ff-only feature/codex/chatting-ui
git branch -d feature/codex/chatting-ui
```

브랜치에 실험 커밋이 많아졌다면 합병 전에 커밋을 정리한다. 논리 커밋을 보존하는
것이 기본이고, squash는 정말 하나의 설명으로 충분한 작은 작업에만 쓴다.

## Merge Policy

이 저장소의 기본값은 linear history다. 작은 공개 UI 패키지에서는 `main` 로그를
읽을 때 기능이 들어온 순서와 검증된 논리 커밋이 바로 보여야 한다.

### Fast-forward merge

다음 경우에는 `git merge --ff-only`를 쓴다.

- 브랜치가 짧고 주제가 하나다.
- 브랜치 안 커밋들이 각각 의미 있는 논리 단위다.
- 병합 시점에 `main`과 갈라진 히스토리가 없다.
- PR 없이 로컬에서 기준선을 쌓는 초기 작업이다.

```powershell
git switch main
git merge --ff-only feature/codex/chatting-ui
```

### Squash merge

다음 경우에는 squash를 고려한다.

- 브랜치 안에 실험 커밋, fixup 커밋, 되돌림 커밋이 많다.
- 최종 변경이 하나의 설명으로 충분하다.
- 중간 커밋을 보존하면 오히려 공개 히스토리를 읽기 어렵다.

Squash를 하더라도 최종 커밋 본문에는 변경 이유와 검증 결과를 남긴다.

### Merge commit

merge commit은 기본값이 아니다. 다음 조건 중 하나를 만족할 때만 의도적으로 남긴다.

- 여러 사람이 같은 feature branch에서 작업했고 branch 자체가 하나의 통합 단위다.
- 장기 feature branch의 중간 커밋 구조를 보존해야 한다.
- 두 개 이상의 독립 하위 작업을 통합한 사실을 히스토리에서 명시해야 한다.
- release, milestone, external PR처럼 합병 이벤트 자체가 기록 가치가 있다.

merge commit을 남길 때는 `--no-ff`를 명시하고, merge commit 본문에도 왜
fast-forward가 아니라 merge commit을 선택했는지 적는다.

```powershell
git switch main
git merge --no-ff feature/codex/chatting-ui
```

정리하면 `fast-forward`가 기본, `squash`는 실험 커밋 정리, `merge commit`은
통합 이벤트를 남길 가치가 있을 때만 쓴다.

## Parallel Workspaces

여러 작업을 동시에 진행할 때는 같은 working tree에서 브랜치만 바꿔가며 작업하지
않는다. 서로 다른 branch를 별도 worktree에 checkout해 파일 시스템과 dev server를
분리한다.

권장 위치:

```text
<workspace-root>\newchobo-ui-package
<workspace-root>\newchobo-ui-package-worktrees\chatting-ui
<workspace-root>\newchobo-ui-package-worktrees\storybook-baseline
```

생성 예시:

```powershell
git switch main
git pull --ff-only
git worktree add ..\newchobo-ui-package-worktrees\chatting-ui -b feature/codex/chatting-ui main
git worktree add ..\newchobo-ui-package-worktrees\storybook-baseline -b chore/storybook/react-vite-baseline main
```

각 worktree 안에서 따로 install, dev server, 검증을 실행한다.

```powershell
Set-Location ..\newchobo-ui-package-worktrees\chatting-ui
pnpm install
pnpm validate
```

병합 순서:

1. 각 worktree에서 작업을 커밋한다.
2. 각 worktree에서 변경 surface에 맞는 검증을 실행한다.
3. main workspace로 돌아와 먼저 합칠 브랜치를 선택한다.
4. `git merge --ff-only <branch>`를 시도한다.
5. 실패하면 해당 worktree에서 `main`을 rebase하거나 충돌을 해결한다.
6. 병합 후 전체 `pnpm validate`를 main workspace에서 다시 실행한다.
7. 병합된 worktree와 branch를 정리한다.

```powershell
git switch main
git merge --ff-only feature/codex/chatting-ui
pnpm validate
git worktree remove ..\newchobo-ui-package-worktrees\chatting-ui
git branch -d feature/codex/chatting-ui
```

동시에 실행하는 dev server는 포트를 분리한다. 예를 들어 샘플 앱은 기본 `5177`을
쓰고, 다른 worktree는 임시로 `vite --port 5178`처럼 실행한다.

## Commit Message

커밋 메시지는 Conventional Commits prefix와 한국어 제목을 쓴다.

```text
<type>(<scope>): <한국어 제목>

<무엇을 왜 바꿨는지>

<이전과 달라진 동작 또는 설계 결정>

검증: <실행한 명령과 결과>
```

- `type`: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`
- `scope`: `workspace`, `tokens`, `react`, `sample`, `storybook`, `readme`, `docs`
- 본문 없는 커밋은 자명한 1줄 변경에만 허용한다.
- UI 변경은 렌더링/접근성/브라우저 smoke 결과를 본문에 남긴다.
- 공개 경계와 관련된 변경은 private 정보 검색 또는 수동 검토 결과를 남긴다.

예시:

```text
feat(react): dialog primitive 상태 정리

Modal과 ConfirmDialog의 제목 연결 방식을 공통화해 dialog accessible name이
누락되지 않게 했다.

브라우저 smoke에서 dialog 열기, 확인 버튼, 닫힘 흐름을 확인했다.

검증: pnpm --filter @newchobo-ui/react typecheck 통과.
```
