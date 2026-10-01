# 안전교육 이수자료 생성 시점 변경

적용일: 2026-10-01

## 확인 및 변경 사항

| 대상 | 기존 처리 | 변경 처리 |
| --- | --- | --- |
| `/manager/reports/attendance/detail/[id]` 저장 | `updateAttendanceRecord` → 공통 출근 RPC에서 미이수 교육자료 생성 | `save_attendance`로 근태만 저장 |
| `/guard/main/attendance` 출근하기 | `clockIn` → 같은 RPC에서 미이수 교육자료 생성 | `save_attendance`로 근태만 저장 |
| DB `ensure_attendance_education(uuid,date)` | 출근일 기준 미이수 교육자료 삽입 | 함수 삭제 |
| 교육이수관리 자료생성 | 출근기간 기준 미이수 자료 일괄 생성 | 버튼·확인창·생성 로직 삭제, 기존 API는 410 반환 |
| 실제 교육 이수 | `complete_education`으로 이수자료 생성 또는 갱신 | 유지 |

운영 DB에서 출근과 교육 이수를 연결하는 별도 생성 트리거는 발견되지 않았다. 교육 알림 예약 작업은 알림 전송용이며 이수자료를 생성하지 않는다.

기존 버전의 출근 처리가 배포 전후에도 정상 작동하도록 `save_attendance_with_education`은 `save_attendance`를 호출하는 호환 함수로 유지한다. 이 함수에도 교육자료 생성 처리는 없다. 새 RPC는 기존과 같이 서버의 `service_role`만 실행할 수 있다.

기존 교육 이수·미이수 이력은 삭제하지 않는다. 새 자료는 실제 이수 시 한국시간의 이수일로 생성하며, 같은 날 재요청은 최초 이수시각을 유지한다. 출근 저장 시 예정 근무일 보존, 중복 출근 방지, 지각·조퇴 판정, 생략된 퇴근시각 보존도 유지한다.

교육자료가 사전 생성되지 않은 직원도 미이수 알림 대상에서 빠지지 않도록, 조회된 출근자의 현재 이수 여부는 알림 서버에서 판정한다. 직원 안전교육 화면은 기존 `current_education_status`가 자료가 없는 교재도 미이수로 조회하므로 그대로 사용할 수 있다.

## DB 적용 및 검증

- 마이그레이션: `supabase/migrations/20261001015420_attendance_without_education.sql`
- 운영 DB에 적용 후 `education_completions` 삽입 함수가 `complete_education`만 남아 있음을 확인했다.
- `supabase/tests/education_periods.sql`에서 출근 시 미생성, 교육 쓰기 실패와 출근 저장의 분리, 실제 이수 생성, 재시도 중복 방지, 기존 이력 보존, 예정 근무일 및 근태 상태, RPC 권한을 검증했다.
- DB 통합 테스트는 트랜잭션 롤백으로 테스트 자료와 임시 제약조건을 모두 제거했다.
- 관련 Vitest 테스트 111개, 애플리케이션 TypeScript 검사 및 변경 파일 ESLint 검사를 통과했다.
