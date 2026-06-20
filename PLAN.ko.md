# Workbench Kit — 작업 계획 (한글)

> **할 일·우선순위 전용.** 소개·빠른 시작은 [`README.md`](./README.md).  
> 영문 DoD: [`completion-plan.md`](./docs/workbench/completion-plan.md) · CSS 공통화: [`layout-css-improvement-plan-2026-06-20.md`](./docs/workbench/layout-css-improvement-plan-2026-06-20.md)

**갱신:** 2026-06-20 (Extension Platform MVP — 미커밋)

---

## Extension Platform MVP (2026-06-20, 미커밋)

| 항목                                      | 상태                            |
| ----------------------------------------- | ------------------------------- |
| WB-33 install (bundled id + localStorage) | **MVP**                         |
| WB-34/35 관리 화면 (Installed \| Browse)  | **MVP** — Settings → Extensions |
| WB-36 theme/locale registry + samples     | **MVP** — Appearance dropdown   |
| docs `extension-install.md`               | 추가                            |
| `validate:static`                         | 통과                            |

**잔여:** remote manifest-url, reload 없는 toggle, locale 전역 UI, `validate:full`, 커밋

---

## 프로젝트 목표

**비전:** VS Code 스타일 워크벤치를 `@workbench-kit/*` monorepo + extension manifest로 제공. Sample host로 UX 검증. UI 영어, i18n·테마는 extension 전제.

**제품 방향 (요청·합의)**

- Activity Bar: Explorer 우선, Search·Chatting·AI Chat, DnD 순서·localStorage 레이아웃 저장
- Chatting(사람) / AI Chat 분리, 버블 UX, sidebar 채팅 테스트
- Explorer·Search·입력(clear 내장) 등 **공통 primitive**로 점진적 통일 — scroll·theme host Phase 1 완료, Phase 2+ 잔여
- Command·preference(WB-30) 점진 적용; workspace → `.workbench/settings.json` 영속화는 **미구현**
- Extension **설치·관리·store**(manifest URL, enable/disable) + **테마·i18n extension** (runtime npm install 금지)
- OpenRouter 등 실 AI transport — 후속

**분석·운영**

- Lane A: WB-23~31 → **S12 closeout** (`validate:full`, 영문 plan 정렬)
- npm OIDC trusted publish, mock admin 서버 **불필요**
- **외부 UI 템플릿·스타터 키트**는 Workbench에 붙이는 대상이 아니라 **유형별 제공 방식 벤치마크** (아래 § 참고)
- 한글 todo는 **이 파일만**; WB-32~36은 `todo.md`에 동기화하지 않음

### UI 템플릿·스타터 키트 유형 (벤치마크)

> **요청 배경:** 다른 웹앱/페이지를 빠르게 만들 때 쓰는 **UI 템플릿·스타터 키트·보일러플레이트**가 어떤 방식으로 제공되는지 **유형별**로 정리. **본 repo에 특정 상품을 통합한다는 뜻 아님.**

| 유형  | 통칭 (영문)                                                        | 제공 방식                                                                             | 라이선스·배포                                                                             | 업데이트·커스터마이즈                                                                     |
| ----- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **A** | **상용 대시보드 템플릿** (commercial admin/dashboard theme)        | 아카이브 또는 private repo; 데모·스타터·풀 패키지; **프레임워크별 변형**              | 마켓플레이스 **1회 구매**; 무료 end-user vs 유료 SaaS **라이선스 tier**; end-product 건당 | **보호 코어 + 사용자 override 레이어** → 업데이트 시 코어만 교체. 또는 **멀티 스택 번들** |
| **B** | **컴포넌트 라이브러리 + Pro scaffold** (UI library + pro template) | npm 라이브러리 + 별도 **Pro 앱 템플릿/scaffold**                                      | 라이브러리 OSS + Pro **구독 또는 1회**                                                    | 라이브러리 semver 업그레이드; 템플릿은 fork 유지보수                                      |
| **C** | **소스 복사형 UI 레지스트리** (source-copy UI registry)            | CLI로 **소스를 프로젝트에 복사**; registry JSON; public/private registry              | 코어 OSS; **블록·테마 팩**은 별도 상용 (재배포·경쟁 template 제한 조항 흔함)              | 코드 전부 소유; **테마 registry**로 토큰 일괄 적용                                        |
| **D** | **SaaS 스타터 키트** (SaaS starter kit / boilerplate)              | Git repo 구매 + lifetime 업데이트; **선택형 플러그인 registry** + codemod + merge CLI | 프로젝트·팀 단위 lifetime; 기능은 **옵션 설치**                                           | 플러그인을 monorepo 하위에 landing; upstream **3-way merge** 도구 제공하는 경우 많음      |
| **E** | **OSS 어드민 프레임워크** (OSS admin framework)                    | npm 프레임워크; CRUD·data layer; UI kit 교체 가능                                     | OSS (+ 상용 support/cloud)                                                                | 앱 코드 자유; headless + UI 분리                                                          |
| **F** | **디자인-코드 번들** (design-code bundle)                          | **디자인 키트(Figma 등)** + 코드 템플릿; live theme customizer                        | 디자인 자산 **별도 라이선스**가 많음                                                      | 디자인 토큰 ↔ CSS vars 수동 정렬                                                          |

**공통 패턴 → Workbench Kit**

1. **카탈로그 → 설치** (A·C·D) ≈ **WB-35** extension store (manifest URL, 정적 feed)
2. **보호 코어 + 확장** (A) ≈ `@workbench-kit/react` + workbench extension
3. **테마·로케일 패키지** (A·C·F) ≈ **WB-36** `contributes.themes` / localizations
4. **소스 소유 vs npm 패키지** (C vs B) ≈ 소비자 trade-off — 본 repo는 **npm monorepo** 경로
5. **프레임워크 변형** (A·D) ≈ host 스택 선택 + extension manifest로 동일 UX

**후속 (선택):** WB-35 설계 시 A+C+D 유형 비교를 영문 architecture 1페이지로 정리

---

## 우선순위

### P0

- [x] **WB-31** — Storybook devtools (`3813df6`)
- [ ] **S12 closeout** — DoD + `pnpm validate:full` + `completion-plan` / `session-work-plan` / `todo.md` 정렬

### P1 (S12 직후)

| 항목              | 첫 slice                                            |
| ----------------- | --------------------------------------------------- |
| i18n              | menu projection 번역 key                            |
| 테마              | ThemeRegistry + dark/light POC                      |
| 설정 영속화       | sample `.workbench/settings.json` write-back        |
| WB-32 구조 map    | project-structure.md 정렬                           |
| UI 공통화 Phase 2 | CSS monolith 분리, Storybook host 전체 마이그레이션 |

Phase 1 UI 공통화(Settings scroll, `WorkbenchStoryHost`, devtools tokens) — **완료** (`c444056`)

### P2 (extension · 구조)

| ID    | 항목               | 선행                                                     |
| ----- | ------------------ | -------------------------------------------------------- |
| WB-32 | 프로젝트 구조 문서 | **MVP** (`extension-install.md`, `project-structure.md`) |
| WB-33 | Extension 설치     | **MVP** (bundled + localStorage; remote URL 후속)        |
| WB-34 | Extension 관리     | **MVP** (Settings Extensions 탭)                         |
| WB-35 | Extension store    | **MVP** (`extension-catalog.json` Browse)                |
| WB-36 | 테마·언어팩        | **MVP** (registry + Appearance 옵션)                     |

기타: EditorService layout, command-core 잔여, sidebar sub-track P1-4

### P3 (여유)

- Lane B JDW, Sidebar Phase B-2/C

### 하지 않음

mock admin 서버 · API 안정화 전 `workbench-react` npm 공개 · runtime npm extension install · **외부 상용 대시보드 템플릿을 Workbench에 그대로 임베드**

---

## 완료 기준선

| 항목              | 상태                       |
| ----------------- | -------------------------- |
| WB-23 ~ WB-31     | 완료                       |
| Phase 1 UI 공통화 | 완료 (`c444056`)           |
| docs/guides       | `a859c84`                  |
| Lane A            | S12 + `validate:full` 잔여 |

**최근:** `c444056` · `3813df6` · `a859c84`
