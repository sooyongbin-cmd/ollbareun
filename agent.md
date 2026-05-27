# 올바른 관리시스템 단계별 개발 계획

## Summary

`doc/system_tree.md`를 기준으로 전체 기능을 한 번에 만들지 않고, 반응형 웹앱 1개 안에서 관리자(admin)와 경비원(guard) 흐름을 단계별로 구현한다.

기본 기술 가정:

- Frontend/App: Next.js 기반 반응형 웹앱
- Backend/Data: Supabase Auth + Postgres + Storage
- 초기 배포: PWA 우선, App Store/Play Store 배포는 후순위
- Supabase 프로젝트 `ollbareun` 사용
- tailwind v4 and shadcn ui 를 사용하고, 디자인에 대한 방향성은 design_guide_wanted.md 파일을 준수해줘.

## Current Execution

현재는 **Phase 1: 단순 출퇴근 MVP**를 수행한다.

Phase 1 상세 범위, 완료 기준, 테스트 계획은 [`agent_phase1.md`](./agent_phase1.md)를 참조한다.

## Phase Files

- [`agent_phase1.md`](./agent_phase1.md): 단순 출퇴근 MVP
- [`agent_phase2.md`](./agent_phase2.md): 안전교육 최소 기능
- [`agent_phase3.md`](./agent_phase3.md): 대시보드 및 리포트
- [`agent_phase4.md`](./agent_phase4.md): 운영 안정화 기능

## Global Assumptions

- 첫 버전은 네이티브 앱이 아니라 반응형 웹앱/PWA로 개발한다.
- Phase 1의 최우선 범위는 출퇴근 기록 생성과 관리자 확인 흐름이다.
- Phase 1에서는 관리자 로그인을 구현하지 않는다.
- Phase 1 경비원 인증은 직원 테이블의 이름과 연락처를 비교하는 단순 인증으로 처리한다.
- 정식 계정 로그인, 세션, 역할 기반 권한 관리는 Phase 4에서 다룬다.
- 안전교육, Excel, QR, 푸시 알림은 출퇴근 MVP 이후 단계적으로 구현한다.
- Phase 1 작업만 현재 수행한다.
- 로컬 테스트 서버 포트는 `3000`을 우선 사용한다.
