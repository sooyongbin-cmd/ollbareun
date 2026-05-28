# 올바른 관리시스템 (Ollbareun) 프로젝트 지침

이 문서는 올바른 관리시스템 프로젝트의 아키텍처, 코딩 표준 및 워크플로우를 정의합니다. Gemini CLI 에이전트는 모든 작업 시 이 지침을 최우선으로 준수해야 합니다.

## 1. 핵심 아키텍처 및 기술 스택
- **Framework:** Next.js (App Router)
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS 4 (Vanilla CSS 스타일의 유틸리티 클래스 선호)
- **Database/Auth:** Supabase (@supabase/supabase-js)
- **Icons:** Lucide React (lucide-react)
- **Testing:** Vitest + React Testing Library (Unit/Integration), Playwright (E2E)

## 2. 코딩 컨벤션 및 디자인 원칙
- **디자인 가이드 준수:** screen-design.md 및 design_guide_wanted.md에 정의된 시각적 요소를 엄격히 따릅니다.
  - 주요 색상: primary, canvas, ink, hairline 등 커스텀 테마 사용.
  - 폰트: font-apple 클래스를 기본으로 사용.
  - 아이콘: lucide-react를 기본 아이콘 라이브러리로 사용하며, 크기와 색상은 텍스트 컨텍스트에 맞게 조정합니다.
- **컴포넌트 구조:** 
  - 클라이언트 컴포넌트는 필요한 경우에만 'use client'를 사용합니다.
  - Phase1App과 같은 핵심 로직은 src/app/ 하위의 공통 컴포넌트로 관리하며, mode와 view 프로퍼티를 통해 분기합니다.
- **데이터 관리:** /api/bootstrap 경로를 통한 초기 데이터 로드 패턴을 유지합니다.

## 3. 테스트 및 검증 지침 (TDD 필수)
- **테스트 우선:** 새로운 기능을 구현하거나 버그를 수정할 때 반드시 실패하는 테스트 케이스를 먼저 작성합니다.
- **검증 도구:**
  - 단위/통합 테스트: npm test -- <path>
  - 린트: npm run lint
- **검증 필수 단계:** 모든 PR 또는 주요 변경 사항 적용 후에는 npm test와 npm run lint를 실행하여 회귀 오류가 없는지 확인합니다.

## 4. 작업 워크플로우
- **문서 참조:** docs/superpowers/ 폴더 내의 스펙(specs/)과 계획(plans/) 문서를 최신 상태로 유지하고 참조합니다.
- **Surgical Edits:** 기존 코드의 의도를 파악하고, 불필요한 리팩토링 없이 요청된 기능을 정밀하게 구현(Surgical Update)합니다.
- **커밋 메시지:** 기능 단위로 명확하게 커밋하며, feat:, fix:, refactor:, test: 접두사를 사용합니다.

## 5. 금지 사항
- **Warning 무시 금지:** TypeScript 오류나 ESLint 경고를 any나 eslint-disable로 회피하지 않습니다.
- **환경 변수 노출 금지:** .env 파일의 비밀키가 코드나 로그에 노출되지 않도록 주의합니다.
