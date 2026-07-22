# 올바름 인력관리시스템 DB 설계서

| 항목 | 내용 |
| --- | --- |
| DBMS | Supabase Postgres |
| 인증 | Supabase Auth |
| 파일 저장소 | Supabase Storage |
| 변경 관리 | `supabase/migrations` SQL 마이그레이션 |

## 1. 설계 원칙

- 기본 식별자는 UUID를 사용하고 생성·수정 시각은 `timestamptz`로 저장한다.
- 업무 데이터의 참조 무결성은 외래키로 보장한다.
- 삭제 시 업무 영향에 따라 `cascade` 또는 `set null`을 구분한다.
- 기간, 상태, GPS 구조는 제약조건으로 검증한다.
- 브라우저 공개키와 서버 전용키의 데이터 접근 범위를 분리한다.

## 2. 주요 관계

```text
employees 1 ── N work_assignments N ── 1 worksites
employees 1 ── N attendance_records N ── 1 worksites
employees 1 ── N education_completions N ── 1 education_resources
worksites 1 ── N inspection_sites 1 ── N inspection_logs
employees 1 ── N inspection_logs
employees 1 ── N inspection_special_reports
employees 1 ── N push_subscriptions
auth.users 1 ── 0..1 admin_users
```

## 3. 테이블 정의

| 테이블 | 주요 필드 | 설명 |
| --- | --- | --- |
| `employees` | `id`, `name`, `phone`, `phone_normalized`, `role`, `is_retired`, `created_at` | 직원 기본정보 |
| `worksites` | `id`, `name`, `address`, `gps_info`, `radius_meters`, `created_at` | 근무지와 출근 인정 범위 |
| `work_assignments` | `id`, `employee_id`, `worksite_id`, `start_date`, `end_date` | 직원별 근무지 배정 기간 |
| `attendance_records` | `employee_id`, `worksite_id`, `work_date`, 출퇴근 시각·좌표 | 일별 근태 기록 |
| `education_resources` | `id`, `title`, `youtube_link`, `created_at` | 안전교육 자료 |
| `education_completions` | `employee_id`, `resource_id`, `is_completed`, `completed_at` | 직원별 교육 이수 |
| `inspection_sites` | `worksite_id`, `name`, `address`, `gps_info` | 점검 대상 현장 |
| `inspection_logs` | 현장·근무지·직원 식별자, 스냅샷 명칭, `qr_payload`, `inspected_at` | QR/NFC 점검 이력 |
| `inspection_special_reports` | 보고자·근무지, 내용, 사진, GPS, 메일 상태, 보고 시각 | 특이사항 보고 |
| `push_subscriptions` | `employee_id`, `endpoint`, `p256dh`, `auth` | 브라우저 푸시 구독 |
| `push_notification_runs` | 알림 코드, 예정 일시, 상태, 결과 | 교육 알림 실행 이력 |
| `guard_session_logs` | 직원, 로그인·메인·로그아웃 상태와 시각 | 근무자 세션 로그 |
| `system_configs` | `system_code`, `parent_system_code`, `description`, `content` | 운영 설정 |
| `admin_users` | `user_id`, `email`, `role`, 등록·최초 로그인 시각 | 관리자 계정 연결 |

## 4. 핵심 제약조건

- 직원 직무는 경비원, 미화원, 파견으로 관리한다.
- 근무 배정은 `start_date <= end_date`여야 하며 동일 직원의 기간이 겹치지 않아야 한다.
- `gps_info`는 위도와 경도를 가진 JSON 객체여야 한다.
- 교육 이수 완료 시 `completed_at`이 존재하고, 미완료 시에는 비어 있어야 한다.
- 푸시 구독은 동일 직원·엔드포인트 조합을 중복 저장하지 않는다.
- 알림 실행 이력은 동일 알림 코드·예정일·예정시각 조합을 중복 실행하지 않는다.

## 5. 인덱스 및 조회 기준

- 외래키, 점검 시각, 로그인 시각, 알림 실행 시각에 조회용 인덱스를 둔다.
- 직원 전화번호는 정규화된 값으로 비교한다.
- 근태·교육 리포트는 연도와 직원 조건을 기준으로 조회한다.
- 푸시 실행 이력은 최신 100건을 유지한다.

## 6. 보안 및 저장소

- 관리자 전용 작업은 서버의 Supabase 관리 클라이언트를 사용한다.
- RLS 정책과 권한은 마이그레이션으로 관리하며 운영 반영 전 최소 권한 원칙을 검토한다.
- 특이사항 사진은 `special-remarks` 저장소에 저장하고 보고 삭제 시 연결 파일도 삭제한다.
- 서비스 역할 키는 서버 환경변수에만 저장하며 클라이언트에 노출하지 않는다.

## 7. 마이그레이션 관리

1. 스키마 변경은 새 SQL 파일로 추가한다.
2. 운영 반영 전 로컬 또는 별도 프로젝트에서 적용·복구 절차를 검증한다.
3. 데이터 변환이 필요한 경우 기존 데이터 보정 후 `NOT NULL`과 제약조건을 적용한다.
4. 적용 순서와 결과를 배포 기록에 남긴다.
