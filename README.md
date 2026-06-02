# 범용 UI 라이브러리

Workbench형 데스크탑 UI를 빠르게 구성하기 위한 공개 UI 패키지입니다.

작은 React workbench primitive를 먼저 안정화한 뒤, 범용 토큰과 프레임워크별
컴포넌트를 단계적으로 확장합니다.

## Packages

- `@newchobo-ui/tokens`: 프레임워크 독립 CSS 변수와 theme 기본값
- `@newchobo-ui/react`: React primitive와 lightweight workbench component

## Public Boundary

공개 패키지에는 특정 제품, 고객, 업무 도메인, 서버 주소, 비공개 저장소 경로,
운영 정책, credential, 예제 데이터가 섞이지 않아야 합니다.

- 문서와 public API는 범용 UI 용어만 사용합니다.
- migration 출처와 프로젝트별 의사결정은 공개 소스가 아닌 별도 작업 기록에 둡니다.
- 컴포넌트는 제품 state나 업무 workflow 대신 primitive, token, layout contract만 노출합니다.

## Commands

```powershell
pnpm install
pnpm typecheck
pnpm sample:dev
pnpm sample:build
```
