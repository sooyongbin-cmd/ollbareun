# 올바름 인력관리시스템 배포 가이드

## 1. 배포 구성

- 애플리케이션: Vercel deployment server
- 데이터베이스·인증·저장소: Supabase
- 정기 작업: Supabase Cron 및 Edge Function
- 외부 연동: Kakao 지도, 도로명주소, Naver mail, Web Push

## 2. 사전 준비

- GitHub 저장소와 Vercel 프로젝트를 연결한다.
- 운영 Supabase 프로젝트를 생성하고 연결 정보를 확보한다.
- 외부 서비스 운영 키와 발신 계정을 준비한다.
- 운영 도메인과 HTTPS 적용 여부를 확인한다.

## 3. 환경변수

| 변수 | 용도 | 노출 범위 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 클라이언트 허용 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 공개키 | 클라이언트 허용 |
| `SUPABASE_SECRET_KEY` 또는 `SUPABASE_SERVICE_ROLE_KEY` | 서버 관리 작업 | 서버 전용 |
| `kakao_map_key` | Kakao 지도·좌표 변환 | 서버 전용 |
| `juso_key` | 도로명주소 검색 | 서버 전용 |
| `NAVER_SMTP_USER` | Naver SMTP 계정 | 서버 전용 |
| `NAVER_SMTP_PASSWORD` | Naver SMTP 비밀번호 | 서버 전용 |
| `NAVER_SMTP_PORT` | SMTP 포트 | 서버 전용 |
| `NAVER_SMTP_FROM` | 발신 주소 | 서버 전용 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push 공개키 | 클라이언트 허용 |
| `VAPID_PRIVATE_KEY` | Web Push 개인키 | 서버 전용 |
| `EDUCATION_REMINDER_CRON_SECRET` | 교육 알림 예약 호출 검증 | 서버 전용 |

## 4. 배포 절차

1. 대상 커밋과 변경 내역을 확인한다.
2. `npm ci`, `npm run lint`, `npm test`, `npm run build`를 통과시킨다.
3. Supabase 마이그레이션을 스테이징에서 먼저 적용한다.
4. 운영 DB를 백업하고 마이그레이션을 적용한다.
5. Vercel 환경변수를 설정하고 대상 커밋을 배포한다.
6. 필요한 Supabase Edge Function과 Vault 비밀값을 배포한다.
7. 도메인, 인증 콜백 URL, PWA 파일과 Service Worker를 확인한다.
8. 배포 후 점검을 완료하고 배포 기록을 남긴다.

## 5. 배포 후 점검

- 회사소개 홈페이지와 관리자·근무자 진입 화면 응답
- 관리자 로그인과 보호 화면 접근
- 직원·근무지·배정 조회
- 테스트 근무자의 로그인과 프로필 조회
- 지도·주소 검색, Naver mail, 푸시 알림 연결
- 정적 이미지, 아이콘, 폰트, PWA 설치 정보
- 서버 로그의 반복 오류와 5xx 응답 여부

## 6. 롤백

- 애플리케이션 문제는 Vercel의 직전 정상 배포를 재배포한다.
- DB 변경은 사전에 검증한 역마이그레이션 또는 백업 복구 절차를 사용한다.
- 데이터가 변경된 후에는 애플리케이션만 먼저 되돌리지 말고 스키마 호환성을 확인한다.
- 장애 원인, 영향 범위, 롤백 시각과 결과를 기록한다.

## 7. 보안 주의사항

- `.env` 파일과 실제 키를 Git에 커밋하지 않는다.
- Preview와 Production 환경변수를 구분한다.
- 퇴사자·담당자 변경 시 서비스 계정과 키를 교체한다.
- 비밀값이 노출되면 즉시 폐기·재발급하고 관련 로그를 점검한다.
