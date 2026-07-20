# 올바름 인력관리시스템 API 명세서

| 항목 | 내용 |
| --- | --- |
| 방식 | Next.js Route Handler 기반 REST API |
| 기본 형식 | JSON |
| 인증 | 관리자 Supabase 세션, 근무자 간편 인증 정보 |

## 1. 공통 규칙

- 요청과 응답의 문자 인코딩은 UTF-8을 사용한다.
- 정상 조회·처리는 200, 삭제 후 본문이 없으면 204를 사용한다.
- 입력 오류는 400, 미인증은 401, 권한 부족은 403, 미존재는 404를 사용한다.
- 오류 응답은 `{ "error": "사용자 안내 메시지" }` 형식을 기본으로 한다.
- 날짜는 `YYYY-MM-DD`, 일시는 ISO 8601 문자열, 식별자는 UUID를 사용한다.

## 2. 기준 엔드포인트

### 2.1 초기 데이터 및 인증

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/bootstrap` | 직원·근무지·배정·근태 초기 데이터 조회 |
| POST | `/api/guard/auth` | 이름·연락처 기반 근무자 인증 |
| GET | `/auth/callback` | 관리자 인증 콜백 처리 |
| POST | `/api/manager/initial-admin/request` | 최초 관리자 등록 요청 |
| GET/POST | `/api/manager/admin-users` | 관리자 목록 조회·등록 |
| PATCH/DELETE | `/api/manager/admin-users/{id}` | 관리자 정보 변경·삭제 |

### 2.2 직원·근무지·배정

| Method | Endpoint | 요청/응답 요약 |
| --- | --- | --- |
| POST | `/api/employees` | 이름·연락처·직무로 직원 등록 |
| GET/PATCH/DELETE | `/api/employees/{id}` | 직원 상세 조회·수정·삭제 |
| POST | `/api/worksites` | 명칭·주소·GPS·반경으로 근무지 등록 |
| GET/PATCH/DELETE | `/api/worksites/{id}` | 근무지 상세 조회·수정·삭제 |
| GET/POST | `/api/assignments` | 배정 목록 조회·등록 |
| GET/PATCH/DELETE | `/api/assignments/{id}` | 배정 상세 조회·수정·삭제 |

### 2.3 출퇴근과 프로필

| Method | Endpoint | 설명 |
| --- | --- | --- |
| POST | `/api/attendance/clock-in` | 당일 배정과 GPS 반경 검증 후 출근 기록 |
| POST | `/api/attendance/clock-out` | 출근 기록 확인 후 퇴근 시각·좌표 저장 |
| GET | `/api/guard/profile?employeeId={id}` | 근무 일정과 최근 1년 월별 근태 조회 |

### 2.4 교육과 알림

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET/POST | `/api/education/resources` | 교육자료 목록 조회·등록 |
| GET/PATCH | `/api/education/resources/{id}` | 교육자료 상세 조회·수정 |
| GET/POST | `/api/education/completions` | 이수 현황 조회·완료 처리 |
| POST | `/api/education/reminders/send` | 미이수자 교육 알림 발송 |
| GET | `/api/notifications/runs` | 알림 실행 이력 조회 |
| POST | `/api/notifications/subscribe` | 푸시 구독 등록 |
| POST | `/api/notifications/unsubscribe` | 푸시 구독 해제 |

### 2.5 점검과 특이사항

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET/POST | `/api/inspection/sites` | 점검 현장 검색·등록 |
| GET/PATCH/DELETE | `/api/inspection/sites/{id}` | 점검 현장 상세·수정·삭제 |
| GET/POST | `/api/inspection/logs` | 점검 이력 조회·등록 |
| POST | `/api/guard/special-remarks/report/naver` | 사진·위치 포함 특이사항 저장 및 Naver mail 전달 |
| GET | `/api/inspection/special-remarks` | 연도별 특이사항 조회 |
| GET/DELETE | `/api/inspection/special-remarks/{id}` | 특이사항 상세 조회·삭제 |

### 2.6 리포트·설정·지도

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/manager/dashboard` | 관리자 대시보드 집계 조회 |
| GET | `/api/manager/reports/attendance` | 직원명·연도 기준 근태 리포트 |
| GET | `/api/manager/reports/education` | 연도 기준 교육 이수 리포트 |
| GET/POST | `/api/system/configs` | 시스템 설정 조회·등록 |
| GET/PATCH/DELETE | `/api/system/configs/{systemCode}` | 설정 상세·수정·삭제 |
| GET | `/api/kakao/geocode?address={주소}` | 주소를 좌표로 변환 |
| GET | `/api/kakao/reverse-geocode` | 좌표를 주소로 변환 |
| GET/POST | `/api/juso/popup` | 도로명주소 검색 팝업 연계 |

## 3. 대표 요청 예시

```json
{
  "employeeId": "UUID",
  "worksiteId": "UUID",
  "latitude": 35.123,
  "longitude": 129.123
}
```

```json
{
  "error": "근무지 반경 안에서만 출근할 수 있습니다."
}
```

## 4. 변경 관리

- API 변경 시 기능명세서, 화면명세서와 호출 화면 테스트를 함께 수정한다.
- 기존 필드 삭제나 의미 변경은 호환성 검토 후 적용한다.
- 서버 로그에 비밀번호, 인증키, 전체 연락처 등 민감정보를 기록하지 않는다.
