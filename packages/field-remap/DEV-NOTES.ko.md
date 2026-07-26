# 🍪 Field Remap — 개발 메모

방향은 OK — 사용자 멘탈 모델(스키마 A/B 컬럼 + 중간 convert + 포트 DnD)과
문서 모델(`MappingEdge` + `transformIds`, shapes는 host-owned)이 이미 일치.
제품 피벗이 아니라 UX/샘플/문서 정렬 문제.

남은 것: Map/Separate/Combine UI 작성(런타임 v2는 있음), 변환·제약 UX 다듬기,
픽셀 단위 BINDINGS 룩(미니맵/줌은 이미 있음).
`MappingEdge`/builtins는 깨질 수 있음.

2개 이상의 입력이 들어오면 그걸 가지고 적절하게 연산 또는 처리 후에 1개의 출력을 내는 기능도 필요
역으로 1개의 데이터를 받아서 2개 이상의 출력을 내는것도 가능
당연하지만 n개의 입력을 받아서 m개의 출력을 뽑아낼 수도 있음
