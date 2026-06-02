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

