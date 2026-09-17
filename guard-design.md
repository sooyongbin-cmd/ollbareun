# `/guard/main` 디자인 적용 기록

## 기준

- 기준 디자인: [Figma `Untitled`, node `4:4`](https://www.figma.com/design/FZPKEdo37LS5msppwkethy/Untitled?node-id=4-4&t=NZHkYZuj4m8XvQLG-4)
- Figma는 읽기 전용 MCP로 확인했으며 디자인 파일은 수정하지 않았다.
- 화면 기준 폭은 `max-width: 420px`이다.
- 공통 영역은 header(Frame 2)와 footer(Frame 30)이다.
- 상세 치수와 공통 스타일은 [Google Sheet `new_guard_design`](https://docs.google.com/spreadsheets/d/1P5W7c2QrfYWe8v2JpXMI7xr0iU5qcf8VIZFF4ZmfuSY/edit)에 기록했다.

## 공통 레이아웃

### Header

- 높이 `60px`, 좌우 padding `20px`.
- `display: flex`, `justify-content: space-between`, `align-items: center`.
- 회사이름로고는 `public/guard-assets/company-logo.svg`로 저장해 사용한다. 내부에는 Figma 원본 SVG 파트를 보존한다.
- 로고 표시 영역은 `144 × 24px`이다.
- 사용자 이름 배지는 `111 × 29px`, 배경 `#EEF0F2`, radius `5px`이며 `이름(직군)` 형식으로 표시한다.
- 배지 텍스트는 Pretendard Regular `13px`, `#1E1E1E`다.

### Main

- 높이는 고정하지 않고 콘텐츠에 따라 늘어난다(hug).
- 첫 번째 근무 카드와 두 번째 바로가기 영역은 좌우 `20px` 여백을 사용한다.
- 첫 번째 카드 내부는 padding `20px`, flex column, gap `20px`이다.
- 두 번째 영역은 width `100%`, 상부 margin `20px`, flex column, gap `11px`이며 높이는 고정하지 않는다.

## 공통 텍스트 스타일

| 스타일 | 적용 예 | 글꼴 | 굵기 | 크기 | 행간 | 색상 |
| --- | --- | --- | --- | ---: | ---: | --- |
| `title텍스트 스타일` | 오늘 근무 | Pretendard | Bold | 24px | normal | `#141414` |
| `푸른강조텍스트 스타일` | 롯데스카이힐 | Pretendard | Medium | 16px | normal | `#005BAC` |
| `일반강조텍스트 스타일` | 오늘 날짜/요일 | Pretendard | SemiBold | 16px | 23px | `#141414` |
| `일반텍스트 스타일` | 근무 예정 시각 | Pretendard | Regular | 16px | 16px | `#141414` |
| `일반버튼 스타일` | 출근하기/퇴근하기 | Pretendard | SemiBold | 18px | 25px | 흰색 |
| 메뉴 버튼 텍스트 | 안전교육/순찰/특이사항 보고/근무 정보 | Pretendard | Medium | 17px | 23px | `#141414` |
| Footer 텍스트 | 홈/출퇴근/안전교육/점검/특이사항/내 정보 | Pretendard | Medium | 12px | 12px | 선택 `#0097E0`, 미선택 `#898989` |

## 버튼 인터랙션

- 활성화된 모든 `button`은 mouse over 시 `cursor: pointer`를 표시한다.
- `disabled` 버튼은 pointer를 적용하지 않아 비활성 상태를 유지한다.
- 공통 규칙은 `src/app/globals.css`의 `button:not(:disabled):hover`에 적용한다.

## 근무 카드

- 제목 행(Frame 9)은 flex와 `justify-content: space-between`을 사용한다.
- 날짜/근무시간 행(Frame 10)도 flex와 `justify-content: space-between`을 사용한다.
- Frame 4의 vector1은 별도 SVG가 아니라 일정 정보 div의 `::after`로 구현한다. 색상 `#00B9EF`, 폭 `3px`, 높이 `44px`이다.
- 날짜는 Asia/Seoul 기준 오늘을 `MM/DD (요일)` 형식으로 표시한다.
- 근무 예정 시간이 여러 건이면 현재 시각이 시작~종료 범위에 포함된 일정을 우선한다. 현재 진행 중인 일정이 없으면 가장 최근 일정을 표시한다.
- 저장된 예정 일정이 없을 때는 배정된 근무의 `in_time`/`out_time`을 사용하고, 둘 다 없으면 `근무시간 미등록`을 표시한다.
- 출근/퇴근 버튼은 width `100%`, height `55px`, padding/margin `0`, 중앙 정렬, 배경 `#005BAC`, radius `10px`이다.

## 바로가기 버튼

- 네 버튼 모두 width `100%`, height `50px`, padding/margin `0`, 내부 텍스트 중앙 정렬이다.
- 순찰과 점검은 같은 링크 내용인 `/guard/main/work`를 사용한다.
- 현재 연결은 다음과 같다.

| 표시명 | 경로 |
| --- | --- |
| 안전교육 | `/guard/main/safety` |
| 순찰 | `/guard/main/work` |
| 특이사항 보고 | `/guard/main/special-remarks` |
| 근무 정보 | `/guard/main/profile` |

## Footer

- 높이 `60px`, 화면 하단 고정.
- 아이콘 묶음은 padding/margin 없이 상하좌우 중앙 정렬한다.
- 각 아이콘 슬롯은 `60 × 36px`, 아이콘과 텍스트 사이 gap은 `6px`이다.
- 아이콘은 `public/guard-assets/`에 SVG로 저장한다.

| 순서 | 표시명 | SVG | 크기 |
| ---: | --- | --- | ---: |
| 1 | 홈 | `home.svg` | `16 × 16px` |
| 2 | 출퇴근 | `clock.svg` | `16 × 16px` |
| 3 | 안전교육 | `safety.svg` | `16 × 16px` |
| 4 | 점검 | `inspection.svg` | `16 × 16px` |
| 5 | 특이사항 | `remarks.svg` | `16 × 16px` |
| 6 | 내 정보 | `profile.svg` | `13 × 13px` glyph, `16 × 16px` slot |

- 선택 색상은 `#0097E0`, 미선택 색상은 `#898989`이다.
- 경로는 각각 `/guard/main`, `/guard/main/attendance`, `/guard/main/safety`, `/guard/main/work`, `/guard/main/special-remarks`, `/guard/main/profile`이다.

## 정리한 기존 항목

- 새 메인 디자인에 없는 NFC체크포인트, 근무시간, 안전교육상황 항목은 메인 화면에서 제거했다.
- 개인프로필 표기는 내 정보로 변경했다.
- Footer 안전교육 표기는 Figma의 오탈자 대신 기능명에 맞춰 `안전교육`으로 사용했다.

## 출퇴근 팝업 모달

- 출근 처리 완료 모달은 화면 전체를 기준으로 가로·세로 중앙에 배치한다.
- 모달은 콘텐츠에 따라 높이가 늘어나는 `hug` 방식으로 구성하고, 공통 폭은 `380px`로 한다.
- 좌우 여백이 필요한 작은 화면에서는 `width: calc(100% - 40px)`, `max-width: 380px`을 사용한다.
- 모달 내부는 좌우 padding `20px`, 상하 padding `30px`, 요소 간 gap `16px`을 사용한다.
- 모달 제목은 Pretendard Bold `24px`, 안내 문구는 Pretendard Medium `16px` 및 Pretendard SemiBold `13px`, 확인 버튼은 일반버튼 스타일을 사용한다.

## 구현 파일

- 공통 shell: `src/app/guard/main/layout.tsx`, `src/app/globals.css`
- 메인 카드/바로가기: `src/app/guard/main/guard-worksite-section.tsx`, `src/app/guard/main/page.tsx`
- 회사 로고: `src/app/guard/main/guard-company-logo.tsx`, `public/guard-assets/company-logo.svg`, `public/guard-assets/logo-parts/`
- Footer: `src/app/guard/main/guard-bottom-navigation.tsx`, `public/guard-assets/*.svg`
- 세션 일정 조회: `src/lib/phase1-data.ts`
