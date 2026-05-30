# Design Guide

이 문서는 올바른 관리시스템 UI를 구현할 때 따라야 하는 디자인 기준이다. 화면을 만들거나 수정하기 전에 이 파일과 `src/app/globals.css`의 토큰 및 공통 클래스를 우선 확인한다.

## 1. Design Direction

- 관리자는 반복적으로 목록을 확인하고 수정하는 업무 화면을 사용한다. 화면은 조용하고 명확하며 스캔하기 쉬워야 한다.
- 경비원 화면은 모바일 PWA 사용을 우선한다. 입력은 적고, 주요 동작은 크고 명확해야 한다.
- 마케팅 페이지처럼 장식적인 hero, 과한 카드 중첩, 의미 없는 그래픽 배경을 만들지 않는다.
- 기존 Apple-like 톤을 유지한다: 흰 배경, 옅은 회색 표면, 얇은 경계선, 파란 주요 액션, 큰 여백, 부드러운 pill 버튼.
- 새 스타일을 만들기보다 기존 토큰과 공통 클래스를 먼저 재사용한다.

## 2. Tokens

색상, radius, spacing, shadow, font는 `src/app/globals.css`의 `@theme inline` 값을 기준으로 한다.

주요 색상:

- `primary`: 주요 액션, 활성 링크, 핵심 강조
- `canvas`: 기본 배경
- `canvas-parchment`: 검색 영역, 폼 영역, 보조 배경
- `surface-black`: 상단 전역 내비게이션
- `ink`: 기본 텍스트
- `ink-muted-80`: 보조 제목
- `ink-muted-48`: 설명, 라벨, 비활성에 가까운 텍스트
- `hairline`: 경계선
- `divider-soft`: 테이블 row 구분

사용 규칙:

- 컴포넌트 내부에 임의 HEX 색상을 추가하지 않는다. 필요하면 먼저 토큰을 추가하거나 기존 토큰을 사용한다.
- 상태 메시지는 기존 `.status-ok`, `.status-warn`을 우선 사용한다.
- 의미가 다른 색상을 같은 목적으로 재사용하지 않는다. 예: 경고/오류는 primary blue로 표현하지 않는다.

## 3. Typography

- 한글 본문 및 UI 문구는 `Noonnu`를 사용한다. 실제 폰트 파일은 `public/Pretendard-1.3.9/web/variable/woff2/PretendardVariable.woff2`를 로드한다.
- Tailwind에서는 `--font-noonnu`를 기준으로 하고, 앱 전체 기본 폰트는 `font-apple`과 `--font-apple`을 통해 같은 폰트 스택을 사용한다.
- 큰 페이지 제목은 `text-[40px] font-semibold leading-[1.1]` 패턴을 사용한다. 모든 제목과 본문 텍스트는 `letter-spacing: 0`을 유지한다.
- 섹션 제목은 `text-[24px]` 수준, 카드/패널 안의 제목은 `text-[17px]`~`text-[20px]` 수준을 우선한다.
- 폼 라벨과 보조 라벨은 `text-[14px] font-semibold text-ink-muted-48` 패턴을 우선 사용한다.
- 본문 기본 크기는 17px, 테이블 헤더는 12px uppercase 패턴을 사용한다.
- 화면 밀도가 높은 관리 화면에서도 글자 크기를 과도하게 줄이지 않는다.

## 4. Layout

- 기본 콘텐츠 폭은 `max-w-[980px]`를 우선 사용한다. 관리자 화면처럼 좌측 메뉴와 업무 테이블을 함께 쓰는 화면은 `max-w-[1180px]`를 사용한다.
- 관리자 화면은 상단 내비게이션 + 보조 내비게이션 + 좌측 메뉴 + 본문 구조를 유지한다.
- 본문 페이지의 큰 상하 여백은 `py-[80px]`, 섹션 간격은 `space-y-[24px]` 또는 `space-y-[80px]` 패턴을 따른다.
- 폼/검색/목록 영역은 full-width 섹션 안에 배치하고, 중첩 카드 구조는 피한다.
- 모바일에서는 주요 액션 버튼이 `w-full`이 되도록 하고, 데스크톱에서는 `md:w-auto`로 전환한다.
- 클릭 가능한 row/card에는 hover 상태를 제공하고 키보드 접근도 가능하게 한다.

## 5. Components

### Buttons

- 주요 저장/진입/실행 동작은 `.button-primary`를 사용한다.
- 취소/뒤로/삭제 확인의 보조 동작은 `.button-secondary`를 사용한다.
- **저장 버튼은 "저장" 글자 대신 `SaveIcon`을 사용한다.**
- **삭제 버튼은 "삭제" 글자 대신 `DeleteIcon`을 사용한다.**
- 같은 종류의 버튼을 화면마다 새 Tailwind 조합으로 만들지 않는다.
- 비활성 상태는 `disabled` 속성과 시각적 비활성 표현을 함께 제공한다.
- icon-only 버튼을 만들 경우 반드시 `aria-label`을 제공한다.

### Fields

- input, select, textarea는 `.field`를 우선 사용한다.
- 모든 입력에는 연결된 label이 있어야 한다.
- placeholder는 label 대체로 사용하지 않는다.
- 오류는 입력 주변에 보이는 메시지로 제공한다.
- 날짜 범위처럼 한 개의 개념에 여러 입력이 있는 경우 그룹 라벨을 보이고 각 입력에는 접근 가능한 개별 라벨을 제공한다.

### Tables

- 목록 테이블은 `.apple-table`을 사용한다.
- 텍스트 컬럼은 좌측 정렬, 상태/액션/숫자성 요약은 필요할 때 우측 정렬한다.
- **정렬(Sort)이 필요한 테이블 헤더는 공통 컴포넌트인 `SortableHeader`를 사용해 정렬 상태를 관리한다.**
- 빈 결과 상태는 반드시 제공한다.
- row 클릭이 가능하면 `role`, `tabIndex`, Enter/Space 처리 등 키보드 동작을 제공한다.

### Cards And Panels

- 반복 항목, 모달, 실제로 경계가 필요한 도구에만 카드 스타일을 사용한다.
- 카드 안에 다시 카드가 들어가는 구조는 피한다.
- 기본 패널은 `bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50` 패턴을 우선 사용한다.
- 내부 기록/요약 블록은 `bg-canvas rounded-[18px] p-6 border border-hairline` 패턴을 사용한다.

### Dialogs

- 삭제나 되돌릴 수 없는 동작은 모달 확인을 사용한다.
- **브라우저 기본 `window.alert`, `window.confirm` 사용은 금지한다.** 반드시 `AlertModal`, `ConfirmModal` 컴포넌트를 사용한다.
- 모달은 명확한 제목, 설명, 확인/취소 버튼을 포함한다.
- 닫기/취소/확인 동작은 키보드로 접근 가능해야 한다.

## 6. Accessibility

- 버튼, 링크, 입력, 테이블 row 동작은 키보드로 접근 가능해야 한다.
- focus-visible 스타일을 제거하지 않는다.
- 상태를 색상만으로 전달하지 않는다. 텍스트 메시지나 badge label을 함께 제공한다.
- 텍스트 대비가 낮은 색 조합을 만들지 않는다.
- 모달은 배경과 구분되고, 주요 액션과 취소 액션이 명확히 구분되어야 한다.
- 모바일 터치 대상은 최소 44px 높이를 목표로 한다.

## 7. Responsive Rules

- 관리자 목록/검색 화면은 데스크톱에서 밀도 있게, 모바일에서 세로 흐름으로 읽히게 구성한다.
- 경비원 화면은 `max-w-[600px]` 중심 단일 컬럼을 우선한다.
- grid는 `md:grid-cols-*`로 확장하고, 모바일 기본값은 1열 또는 명확한 2열만 사용한다.
- 긴 텍스트는 `truncate`, `min-w-0`, 줄바꿈 제어를 사용해 nav/header를 깨지 않게 한다.

## 8. Implementation Rules

- 새 화면을 만들 때 기존 화면의 구조와 공통 클래스를 먼저 찾는다.
- `button-primary`, `button-secondary`, `field`, `status-ok`, `status-warn`, `apple-table`을 우선 재사용한다.
- Tailwind 임의값은 기존 패턴과 맞을 때만 사용한다. 새로운 수치를 계속 늘리지 않는다.
- 공통 패턴이 3회 이상 반복되면 작은 컴포넌트로 분리한다.
- UI 문구는 화면 사용자가 해야 할 행동과 현재 상태를 직접 설명해야 한다.
- 화면 검증 시 데스크톱과 모바일 폭에서 텍스트 겹침, 버튼 넘침, 테이블 깨짐을 확인한다.

## 9. Do Not

- 의미 없는 장식용 그래디언트, 오브, 블롭, bokeh 배경을 추가하지 않는다.
- 페이지 섹션 전체를 떠 있는 카드처럼 과도하게 감싸지 않는다.
- 카드 안에 카드를 중첩하지 않는다.
- 임의 HEX 색상과 임의 shadow를 컴포넌트마다 추가하지 않는다.
- placeholder만으로 입력 의미를 설명하지 않는다.
- 모바일에서 버튼 텍스트가 잘리거나 줄 밖으로 넘치게 두지 않는다.
- 접근성 라벨 없는 icon-only 버튼을 만들지 않는다.
