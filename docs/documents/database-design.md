# 올바름 인력관리시스템 DB 설계서

| 항목 | 내용 |
| --- | --- |
| DBMS | Supabase Postgres |
| 인증 | Supabase Auth (`auth.users`) |
| 파일 저장소 | Supabase Storage (`special-remarks` 버킷) |
| 변경 관리 | `supabase/migrations` SQL 마이그레이션 |
| 대조 기준 | 운영 `public` 스키마, SQL 마이그레이션, 서버 조회 코드 |

## 1. 설계 원칙

- 기본 식별자는 UUID를 사용하고 생성·수정 시각은 `timestamptz`로 저장한다.
- 업무 데이터의 참조 무결성은 외래키와 삭제 규칙(`cascade`, `set null`)으로 보장한다.
- 기간, 상태, GPS 구조, 완료 상태처럼 데이터만으로 검증할 수 있는 규칙은 DB 제약조건으로 검증한다.
- 휴무일·일별 예정 출퇴근 시각은 근무 배정 기간과 항상 일치해야 한다.
- 브라우저 공개키와 서버 전용키의 데이터 접근 범위를 분리한다.
- 아래 인덱스 목록에서는 모든 `PRIMARY KEY`가 만드는 PK 인덱스는 반복 기재하지 않고, 업무 조회·UNIQUE·EXCLUDE 인덱스를 중심으로 정리한다.

## 2. 주요 관계

```text
auth.users 1 ── 0..1 employees ── N work_assignments N ── 1 worksites
                         │                 │
                         │                 ├── N work_assignment_days_off
                         │
                         ├── N work_record N ── 1 worksites
                         ├── N education_completions N ── 1 education_resources
                         ├── N inspection_logs
                         ├── N inspection_special_reports
                         ├── N push_subscriptions
                         └── N guard_passkey_requests

worksites 1 ── N inspection_sites 1 ── 0..N inspection_logs
auth.users 1 ── 0..1 admin_users
auth.users 1 ── N manager_push_subscriptions
system_configs 1 ── N system_configs (parent_system_code)
```

- `inspection_logs`와 `inspection_special_reports`의 직원·근무지·현장 참조는 이력 보존을 위해 일부 `set null`로 동작한다.
- `public_holidays`는 `work_assignment_days_off`와 외래키로 연결하지 않고, 야간근무 일정 생성 함수가 선택된 휴일을 조회해 반영한다.
- `auth.users`와 `storage.objects`는 Supabase 관리 영역이며 애플리케이션 테이블 목록에는 별도로 포함하지 않는다.

## 3. 테이블 정의

| 테이블 | 주요 필드 | 설명 |
| --- | --- | --- |
| `employees` | `id`, `name`, `phone`, `phone_normalized`, `role`, `is_retired`, `auth_user_id`, `passkey_enabled`, `work_style`, `in_time`, `out_time`, `created_at` | 직원 기본정보, 인증 연결, 근무형태·기본 출퇴근 시간 |
| `worksites` | `id`, `name`, `address`, `gps_info`, `radius_meters`, `created_at` | 근무지와 GPS 출근 인정 범위 |
| `work_assignments` | `id`, `employee_id`, `worksite_id`, `start_date`, `end_date`, `in_time`, `out_time`, `created_at` | 직원별 근무지 배정 기간 및 배정별 출퇴근 기준 시간 |
| `work_assignment_days_off` | `id`, `work_assignment_id`, `day_off_date`, `created_at` | 배정별 수동·자동 휴무일 |
| `work_record` | `id`, `employee_id`, `worksite_id`, `work_date`, `intime`, `outtime`, `work_intime`, `work_outtime`, `intime_status`, `outtime_status`, 출퇴근 위도·경도, `created_at`, `updated_at` | 직원별 일자 기준 근무예정과 실제 출퇴근을 통합 관리. `(employee_id, work_date)` UNIQUE |
| `public_holidays` | `id`, `holiday_date`, `name`, `selected`, `created_at` | 공휴일 및 관리자가 추가한 휴일. `selected = 'Y'`인 날짜만 야간근무 자동 휴무에 사용 |
| `education_resources` | `id`, `title`, `youtube_link`, `created_at` | 안전교육 자료 |
| `education_completions` | `employee_id`, `resource_id`, `is_completed`, `completed_at` | 직원별 교육 이수 상태. 직원·자료 복합 PK |
| `inspection_sites` | `id`, `worksite_id`, `name`, `address`, `gps_info`, 특이사항 표시·내용·사진 URL, `created_at`, `updated_at` | 근무지에 속한 점검 대상 현장 |
| `inspection_logs` | `id`, `inspection_site_id`, `worksite_id`, `employee_id`, 스냅샷 명칭, `site_gps_info`, `qr_payload`, `inspected_at`, `created_at` | QR/NFC 점검 이력. 이력 당시 직원·근무지·현장명을 스냅샷으로 보존 |
| `inspection_special_reports` | `id`, `worksite_id`, `employee_id`, 스냅샷 명칭, `content`, `photo_url`, `gps_info`, 이메일 상태·처리 상태, `reported_at`, `created_at`, `updated_at` | 특이사항 보고와 사진·GPS·메일 처리 결과 |
| `push_subscriptions` | `id`, `employee_id`, `endpoint`, `p256dh`, `auth`, `created_at`, `updated_at` | 근무자 브라우저 푸시 구독 |
| `manager_push_subscriptions` | `id`, `user_id`, `endpoint`, `p256dh`, `auth`, `created_at`, `updated_at` | 관리자 브라우저 푸시 구독 |
| `push_notification_runs` | `id`, `notification_code`, `scheduled_date`, `scheduled_time`, `status`, `sent_at`, `error_message`, `result`, `created_at`, `updated_at` | 교육 알림 실행·중복 방지·결과 이력 |
| `guard_session_logs` | `id`, `employee_id`, `guard_name`, 로그인·메인 푸시·로그아웃 상태와 시각, 결과 JSON, `created_at`, `updated_at` | 근무자 로그인 세션과 알림 처리 로그 |
| `guard_passkey_requests` | `id`, `employee_id`, `status`, `requested_at`, `reviewed_at`, `reviewed_by`, `registered_at`, `revoked_at`, `created_at`, `updated_at` | 관리자 승인 기반 Passkey 신청·승인·등록·폐기 이력 |
| `system_configs` | `system_code`, `parent_system_code`, `content`, `description`, `created_at`, `updated_at` | 메일 주소·기능 플래그 등 운영 설정 및 계층형 코드 |
| `admin_users` | `id`, `user_id`, `email`, `role`, `created_by`, `first_login_at`, `created_at`, `updated_at` | Supabase Auth 사용자와 관리자 권한 연결 |

### `work_record` 통합 근무기록 상세

`work_record`는 기존의 근무예정 자료와 실제 출근 자료를 직원·근무일 단위의 한 행으로 통합한 테이블이다. 따라서 한 직원은 같은 `work_date`에 하나의 근무기록만 가질 수 있다.

| 컬럼 | 타입 | NULL | 설명 |
| --- | --- | --- | --- |
| `id` | `uuid` | 불가 | 기본키. `gen_random_uuid()` 기본값 |
| `employee_id` | `uuid` | 불가 | `employees.id` 외래키 |
| `worksite_id` | `uuid` | 불가 | `worksites.id` 외래키 |
| `work_date` | `date` | 불가 | 근무일. `employee_id`와 복합 UNIQUE |
| `intime` | `timestamptz` | 가능 | 출근 예정일시 |
| `outtime` | `timestamptz` | 가능 | 퇴근 예정일시 |
| `work_intime` | `timestamptz` | 가능 | 실제 출근일시 |
| `work_outtime` | `timestamptz` | 가능 | 실제 퇴근일시 |
| `intime_status` | `text` | 불가 | `0` 결근, `1` 지각, `2` 정상출근, `3` 정상근무 |
| `outtime_status` | `text` | 가능 | `4` 조기퇴근 |
| `created_at`, `updated_at` | `timestamptz` | 불가 | 생성·수정 시각 |
| `clock_in_latitude`, `clock_in_longitude` | `double precision` | 가능 | 출근 처리 GPS 좌표 보존용 |
| `clock_out_latitude`, `clock_out_longitude` | `double precision` | 가능 | 퇴근 처리 GPS 좌표 보존용 |

상태는 다음 순서로 기록한다.

1. 예정 행은 `intime_status = '0'`으로 생성한다.
2. 출근 처리 시 `work_intime`이 `intime`보다 늦으면 `'1'`(지각), 그렇지 않으면 `'2'`(정상출근)을 저장한다.
3. 예정 퇴근시각 이후 정상 퇴근하면 `intime_status = '3'`(정상근무)으로 변경한다.
4. 예정 퇴근시각보다 일찍 퇴근하면 `outtime_status = '4'`(조기퇴근)를 저장하고 출근 상태는 유지한다.

`work_outtime`은 `work_intime` 없이는 저장할 수 없으며, 일반 클라이언트에는 테이블 권한을 부여하지 않고 서버 `service_role`을 통해서만 접근한다.

### 주요 타입 및 상태 값

- GPS는 `jsonb` 객체 `{ "latitude": number, "longitude": number }` 구조를 사용한다.
- `employees.work_style`은 `0` 일반근무, `1` 격일근무, `2` 야간근무이며, `role`은 `경비원`, `미화원`, `파견` 중 하나다.
- `public_holidays.selected`와 `inspection_special_reports.processing_status`는 `Y/N`이다.
- 이메일 상태는 `pending`, `sent`, `failed`, `not_requested`, 알림 실행 상태는 `processing`, `sent`, `failed`, `skipped`다.
- Passkey 요청 상태는 `pending`, `approved`, `rejected`, `registered`, `revoked`다.

## 4. 핵심 제약조건

### 식별자·필수값·참조 무결성

- UUID 식별자를 사용하는 업무 테이블의 기본키는 `gen_random_uuid()`를 기본값으로 사용한다. `education_completions`는 `(employee_id, resource_id)` 복합 PK, `system_configs`는 `system_code` 텍스트 PK다.
- 직원명·연락처·정규화 연락처, 근무지명·주소, 점검 현장명·주소, 점검 이력의 스냅샷 명칭, 특이사항 내용, 교육 제목·YouTube 링크, 시스템 코드·내용은 `NOT NULL` 및 공백 문자열 방지 CHECK를 적용한다.
- 주요 외래키와 삭제 규칙은 다음과 같다.
  - `employees.auth_user_id → auth.users.id`: `ON DELETE SET NULL`
  - `work_assignments.employee_id → employees.id`: `ON DELETE CASCADE`
  - `work_assignment_days_off.work_assignment_id → work_assignments.id`: `ON DELETE CASCADE`
  - `work_record.employee_id → employees.id`, `work_record.worksite_id → worksites.id`: `ON DELETE CASCADE`
  - 교육 이수의 직원·자료 참조와 Passkey 요청의 직원 참조: `ON DELETE CASCADE`
  - `inspection_sites.worksite_id`: `ON DELETE CASCADE`
  - `inspection_logs`의 현장·근무지·직원 참조와 특이사항 보고의 근무지·직원 참조: `ON DELETE SET NULL`
  - `system_configs.parent_system_code → system_configs.system_code`: `ON DELETE SET NULL`
  - `admin_users.user_id → auth.users.id`: `ON DELETE CASCADE`, `admin_users.created_by → auth.users.id`: `ON DELETE SET NULL`
  - `manager_push_subscriptions.user_id → auth.users.id`: `ON DELETE CASCADE`
- 현재 운영 스키마에서 `work_assignments.worksite_id`에는 외래키가 없고 조회용 인덱스만 있다. 관계도상 참조는 맞지만, 근무지 삭제 시 배정 데이터의 처리 규칙을 정한 뒤 FK를 추가할지 별도 마이그레이션으로 결정해야 한다.

### 업무 규칙 및 상태 검증

- 직원 `role`은 `경비원`, `미화원`, `파견`만 허용하고, `work_style`은 `0`, `1`, `2`만 허용한다. `auth_user_id`는 NULL을 허용하되 한 직원 계정에만 연결되며, Passkey 관련 컬럼은 서버 서비스 역할만 변경할 수 있다.
- 직원의 `(name, phone_normalized)`는 UNIQUE이며, 전화번호 검색·로그인은 입력값을 정규화한 뒤 비교한다.
- 근무 배정은 `start_date <= end_date`이고 동일 직원의 기간이 겹치지 않도록 `daterange` 기반 GiST EXCLUDE 제약을 적용한다. 애플리케이션도 저장 전에 동일 조건을 확인한다.
- 배정별 `in_time`, `out_time`이 없으면 직원 기본 시간을 사용한다. 시간 형식은 애플리케이션에서 `HH:mm[:ss]`로 검증한다.
- 배정 휴무일은 `(work_assignment_id, day_off_date)` UNIQUE이며, 트리거로 해당 배정의 시작일·종료일 안에서만 저장한다. 배정 기간을 줄이면 범위 밖 휴무일은 자동 삭제한다.
- 근무기록은 `(employee_id, work_date)` UNIQUE이며, `intime`·`outtime`은 예정 시각, `work_intime`·`work_outtime`은 실제 시각이다. `work_outtime`은 출근 시각 없이 저장할 수 없다.
- `intime_status`는 `0` 결근, `1` 지각, `2` 정상출근, `3` 정상근무를 사용하고, 조기퇴근 시 `outtime_status = '4'`를 저장한다.
- 근무지·점검 현장의 `gps_info`, 점검 이력의 `site_gps_info`는 객체이며 `latitude`·`longitude` 숫자 필드를 가져야 한다. 특이사항 보고의 `gps_info`는 애플리케이션에서 같은 형태로 정규화하지만 현재 DB CHECK는 없다.
- `radius_meters`는 현재 애플리케이션에서 최소 1m로 보정하며 DB CHECK는 없다.
- 교육 이수는 `is_completed = false`이면 `completed_at IS NULL`, `true`이면 `completed_at IS NOT NULL`이어야 한다.
- 푸시 구독은 근무자의 `(employee_id, endpoint)`를 UNIQUE로 관리한다. 관리자 구독은 `(user_id, endpoint)`와 `endpoint`를 모두 UNIQUE로 관리해 한 브라우저 엔드포인트의 중복 등록을 막는다.
- 공휴일은 `holiday_date` UNIQUE, `selected`는 `Y/N`이다. 야간근무 자동 휴무는 주말 또는 `selected = 'Y'` 공휴일을 대상으로 한다.
- 알림 실행 이력은 `notification_code`, `scheduled_date`, `scheduled_time` 조합이 UNIQUE이고, `scheduled_time`은 `HH:mm` 정규식으로 검증한다. 상태는 `processing`, `sent`, `failed`, `skipped`만 허용한다.
- 특이사항 메일 상태는 `pending`, `sent`, `failed`, `not_requested`이며 `sent`일 때 `email_sent_at`이 있어야 한다. `not_requested`를 지원하므로 `email_to`는 NULL을 허용한다. 처리 상태는 `Y/N`이다.
- 세션 로그의 로그인 상태는 `success/failed`, 메인 푸시 상태는 `success/warning/error/skipped`만 허용한다.
- Passkey 요청은 정의된 5개 상태만 허용하며 `approved/rejected`는 `reviewed_at`, `registered`는 `registered_at`, `revoked`는 `revoked_at`이 반드시 있어야 한다. 직원별 `pending/approved` 진행 중 요청은 하나만 허용한다.
- 관리자 역할은 `admin/super_admin`만 허용한다. `user_id`가 있는 관리자 계정은 하나만 연결되고, 이메일은 공백 제거·소문자 기준으로 중복되지 않는다.
- 시스템 설정의 `system_code`와 `content`는 공백이 아니어야 하며, `parent_system_code`는 자기 테이블의 유효한 코드 또는 NULL이다.

## 5. 인덱스 및 조회 기준

### 현재 업무 인덱스

| 테이블 | 인덱스 및 목적 |
| --- | --- |
| `employees` | `employees_name_phone_normalized_key` `(name, phone_normalized)` UNIQUE 로그인·중복 방지, `employees_auth_user_id_key` `auth_user_id` 부분 UNIQUE 인증 사용자 연결, `employees_passkey_enabled_idx` Passkey 대상 필터 |
| `worksites` | PK 인덱스만 있음. 현재 목록은 `created_at` 정렬 후 이름을 클라이언트에서 필터링 |
| `work_assignments` | `work_assignments_employee_period_no_overlap` GiST EXCLUDE 기간 중복 방지, `idx_work_assignments_worksite_id` 근무지별 배정 조회 |
| `work_assignment_days_off` | `work_assignment_days_off_assignment_date_unique` `(work_assignment_id, day_off_date)` UNIQUE, `work_assignment_days_off_date_idx` 날짜별 휴무 조회 |
| `work_record` | `work_record_employee_date_key` `(employee_id, work_date)` UNIQUE로 일별 중복 방지, `work_record_work_date_idx` 날짜별 조회, `work_record_worksite_id_idx` 근무지별 조회 |
| `public_holidays` | `holiday_date` UNIQUE 공휴일 upsert·날짜 조회 |
| `education_completions` | `education_completions_employee_id_idx`, `education_completions_resource_id_idx`, `education_completions_is_completed_idx`, 복합 PK로 직원·자료별 교육 상태 조회 |
| `inspection_sites` | `inspection_sites_worksite_id_idx` 근무지별 현장 조회, `inspection_sites_name_idx` 현장명 정렬·검색 |
| `inspection_logs` | `inspection_logs_worksite_id_idx` 근무지별 필터, `inspection_logs_inspected_at_idx` `inspected_at DESC` 최신 점검순 조회 |
| `inspection_special_reports` | `inspection_special_reports_worksite_id_idx`, `inspection_special_reports_employee_id_idx` 필터, `inspection_special_reports_reported_at_idx` 최신 보고순, `inspection_special_reports_email_status_idx` 처리 상태 필터 |
| `push_subscriptions` | `push_subscriptions_employee_id_idx` 푸시 발송 대상 조회와 `push_subscriptions_employee_endpoint_key` `(employee_id, endpoint)` UNIQUE 중복 방지 |
| `manager_push_subscriptions` | `manager_push_subscriptions_user_id_idx` 관리자별 구독 조회, `(user_id, endpoint)` 및 `endpoint` UNIQUE |
| `push_notification_runs` | `push_notification_runs_created_at_idx` 최신 실행순, `push_notification_runs_schedule_idx` 스케줄 확인, `push_notification_runs_unique_schedule` 동일 스케줄 UNIQUE |
| `guard_session_logs` | `guard_session_logs_login_at_idx` 최신 세션순, `guard_session_logs_employee_id_idx`, `guard_session_logs_login_status_idx`, `guard_session_logs_guard_name_idx` 조건 조회 |
| `guard_passkey_requests` | `guard_passkey_requests_employee_id_idx`, `guard_passkey_requests_status_idx`, `guard_passkey_requests_requested_at_idx` 승인 목록 조회, `guard_passkey_requests_one_open_request_per_employee_idx` 진행 중 요청 부분 UNIQUE |
| `system_configs` | `system_configs_parent_system_code_idx` 계층 설정 조회 |
| `admin_users` | `admin_users_role_idx`, `admin_users_created_at_idx`, `admin_users_created_by_idx`, `admin_users_first_login_at_idx`, `admin_users_user_id_unique_idx` NULL이 아닌 `user_id` 부분 UNIQUE, `admin_users_email_unique_idx` `lower(btrim(email))` UNIQUE 및 기존 `email` UNIQUE |

### 화면·API별 조회 기준

- 직원 로그인은 `name = 입력 이름`과 `phone_normalized = 정규화 전화번호`를 함께 사용한다. 직원 목록은 재직 여부·직무·이름 검색과 `created_at DESC`를 사용한다.
- 근무지 목록은 `created_at DESC`를 기본 정렬로 사용하고 이름·주소 조건을 적용한다. 현재 이름·주소 필터는 목록 데이터에 대한 클라이언트 필터다.
- 근무 배정은 `start_date DESC, created_at DESC`로 정렬하고, 직원·근무지 조건 또는 `start_date <= 기준일 AND end_date >= 기준일`로 현재 배정을 찾는다. 수정 시 같은 직원의 기간 겹침을 `start_date <= 대상 종료일 AND end_date >= 대상 시작일`로 확인한다.
- 휴무일은 `work_assignment_id`와 `day_off_date`를 함께 사용해 단건 upsert·삭제하고, 날짜별 전체 휴무 목록은 `day_off_date`로 조회한다.
- 일별 예정·실제 출퇴근은 `work_record`에서 직원·근무일·배정 기간을 기준으로 조회한다. 대시보드·근태 현황은 `work_date = 기준일` 및 `intime IS NOT NULL`을 기준으로 예정 인원을 집계한다.
- 실제 근태는 근무자별 미퇴근 기록을 `employee_id`, `work_outtime IS NULL`, `work_intime DESC`, `LIMIT 1`로 찾고, 당일 기록은 `employee_id + work_date`로 찾는다. 리포트는 `work_date`의 연도 범위(`YYYY-01-01`부터 `YYYY-12-31`)를 조회하고 날짜순으로 정렬한다.
- 점검 이력은 근무지 필터와 `inspected_at DESC`를 사용한다. 점검 현장은 `worksite_id` 또는 현장명 기준으로 조회한다.
- 특이사항 보고는 연도·근무지·보고자 조건과 `reported_at DESC`를 사용하며, 메일 상태별 재처리 대상을 `email_status`로 찾는다.
- 교육 리포트는 직원과 자료를 조인해 이수 여부를 표시하고, 완료 건수는 완료 상태이면서 `completed_at`이 조회 연도에 속하는 자료만 포함한다.
- 교육 알림 실행 이력은 알림 코드·상태를 선택적으로 필터링하고 `created_at DESC`, 기본 최대 100건을 조회한다. insert 후 트리거가 최신 100건만 남긴다.
- 근무자 세션 로그는 `login_at DESC`로 정렬하고 `guard_name`, `login_status`, 메인 푸시 상태를 선택적으로 필터링한다. 관리 화면은 페이지 범위를 사용한다.
- Passkey 요청은 직원별 최신 요청을 `requested_at DESC LIMIT 1`로 조회하고, 관리자 목록은 같은 기준의 전체 최신순이다.
- 관리자 푸시는 `admin_users`에서 연결된 `user_id`를 모은 뒤 `manager_push_subscriptions.user_id IN (...)`으로 발송 대상을 조회한다. 만료된 endpoint는 endpoint 기준으로 삭제한다.
- 공휴일은 `holiday_date`를 conflict 기준으로 upsert하고, 자동 휴무 생성 함수는 `selected = 'Y'`인 날짜만 사용한다.

### 인덱스 보완 검토 대상

- `work_record`는 `(employee_id, work_date)` UNIQUE와 `work_date`, `worksite_id` 보조 인덱스를 사용한다. 날짜·연도 리포트와 근무지별 조회 실행계획을 운영 데이터량에 맞춰 확인한다.
- `work_assignments`의 현재 직원·기간 조회는 GiST EXCLUDE 인덱스와 조건식을 함께 사용한다. 데이터량이 커지면 직원별 기간 조회용 B-tree 복합 인덱스의 실행계획을 확인한다.
- `worksites`의 이름 검색·생성일 정렬은 현재 보조 인덱스가 없다. 서버 측 검색·페이지네이션으로 전환할 때 `name` 또는 `created_at` 인덱스를 검토한다.
- `inspection_logs`는 현재 근무지·시각 중심이다. 현장별 또는 직원별 이력 조회가 추가되면 `inspection_site_id`, `employee_id` 인덱스를 검토한다.
- `guard_session_logs.guard_name` 인덱스는 현재 `ILIKE '%검색어%'` 조건에서는 효율이 제한될 수 있으므로, 검색량이 커지면 trigram 인덱스 또는 prefix 검색으로 전환을 검토한다.

## 6. 보안 및 저장소

- 관리자 전용 작업과 민감한 배정·휴무·일별 예정시각 작업은 서버의 Supabase 관리 클라이언트를 사용한다.
- RLS 정책과 권한은 마이그레이션으로 관리한다. `push_notification_runs`, `manager_push_subscriptions`, `work_assignment_days_off`, `work_record`, `guard_passkey_requests`, `public_holidays`는 일반 클라이언트 권한을 제한하고 서버 역할 중심으로 접근한다.
- 특이사항 사진은 `special-remarks` 저장소에 저장하고 보고 삭제 시 연결 파일도 삭제한다.
- Passkey 컬럼 변경은 서버 서비스 역할만 허용하는 트리거로 보호한다.
- 서비스 역할 키와 메일·푸시 비밀값은 서버 환경변수에만 저장하며 클라이언트에 노출하지 않는다.

## 7. 마이그레이션 관리

1. 스키마 변경은 새 SQL 파일로 추가한다.
2. 운영 반영 전 로컬 또는 별도 프로젝트에서 적용·복구 절차를 검증한다.
3. 데이터 변환이 필요한 경우 기존 데이터 보정 후 `NOT NULL`과 제약조건을 적용한다.
4. 새 외래키나 인덱스를 추가할 때 기존 데이터 정합성과 실행계획을 먼저 확인한다.
5. 적용 순서와 결과를 배포 기록에 남긴다.

### 근무예정·출근 자료 통합 이력

- `20260918103734_work_record_attendance.sql`에서 기존 `work_assignment_daily_attendance`의 예정 시각과 `attendance_records`의 실제 출퇴근 자료를 `employee_id + work_date` 기준으로 통합한다.
- 통합 시 예정 시각은 `intime`, `outtime`, 실제 시각은 `work_intime`, `work_outtime`으로 옮기고, 기존 GPS 좌표와 생성·수정 시각도 보존한다.
- 데이터 통합과 정합성 확인 후 두 기존 테이블은 `DROP TABLE ... CASCADE`로 제거한다. 이후 배정 저장·수정 시 일별 근무예정 행은 `work_record`에 생성·갱신한다.
- 과거 테이블명을 사용하는 애플리케이션 조회·등록·수정·삭제 로직은 모두 `work_record`로 전환했으며, 과거 마이그레이션 파일은 당시 적용 이력을 보존하기 위해 수정하지 않는다.
