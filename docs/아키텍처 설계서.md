# 올바름 인력관리시스템 아키텍처 설계서

| 항목 | 내용 |
| --- | --- |
| 프런트엔드 | Next.js 16, React 19, TypeScript, Tailwind CSS |
| 서버 | Next.js App Router 및 Route Handler |
| 데이터·인증 | Supabase Postgres, Auth, Storage |
| 배포 | Vercel deployment server |
| 앱 형태 | 반응형 웹, PWA |

## 1. 구성도

```text
[PC·모바일 브라우저/PWA]
          │ HTTPS
          ▼
[Vercel / Next.js Application]
  ├─ 회사소개·관리자·근무자 UI
  ├─ Server Components / Client Components
  ├─ Route Handler API
  └─ Service Worker
          │
          ├────────► [Supabase Auth]
          ├────────► [Supabase Postgres]
          ├────────► [Supabase Storage]
          ├────────► [Kakao 지도·도로명주소]
          ├────────► [Naver mail]
          └────────► [Web Push/VAPID]
```

## 2. 애플리케이션 계층

| 계층 | 위치 | 책임 |
| --- | --- | --- |
| 화면 | `src/app` | 라우팅, 화면 구성, 사용자 상호작용 |
| 공통 UI | `src/components` | 아이콘, 모달, 정렬 등 재사용 요소 |
| API | `src/app/api` | 입력 검증, HTTP 응답, 서비스 호출 |
| 도메인·데이터 | `src/lib` | 업무 규칙, Supabase 조회·저장, 외부 연동 |
| DB 변경 | `supabase/migrations` | 테이블, 제약조건, 인덱스, RLS 변경 |
| 배치 | `supabase/functions` | 교육 미이수 알림 예약 실행 |

## 3. 주요 처리 흐름

### 3.1 관리자

1. Supabase Auth로 인증한다.
2. 서버가 관리자 등록 여부를 확인한다.
3. 관리 화면에서 Route Handler를 호출한다.
4. 서버가 입력과 권한을 검증한 뒤 DB를 조회·변경한다.

### 3.2 현장 근무자

1. 이름과 정규화된 연락처로 직원을 확인한다.
2. 브라우저 세션에 근무자 정보를 유지한다.
3. 출퇴근 시 배정·일자·GPS 반경을 검증한다.
4. 교육·점검·특이사항 결과를 서버를 통해 저장한다.

### 3.3 교육 알림

1. Supabase Cron이 Edge Function을 정기 호출한다.
2. 설정된 발송 시각과 중복 실행 여부를 확인한다.
3. 미이수자와 유효한 푸시 구독을 계산한다.
4. Web Push를 발송하고 실행 결과를 기록한다.

## 4. 보안 구조

- 모든 통신은 HTTPS를 사용한다.
- 공개 Supabase 키와 서버 전용 서비스 키를 분리한다.
- 관리자 보호 화면과 관리자 API는 인증·등록 여부를 검증한다.
- Cron 호출은 공유 비밀값으로 검증한다.
- 사진 업로드는 허용 형식과 최대 크기를 검증한다.
- 환경변수와 인증정보는 저장소에 커밋하지 않는다.

## 5. 가용성 및 성능

- 독립적인 조회는 병렬로 실행해 화면 응답 시간을 줄인다.
- 목록 조회에 필요한 외래키와 시각 필드에 인덱스를 둔다.
- 정적 자산과 PWA 파일은 CDN 캐시를 활용한다.
- 외부 API 실패는 사용자 메시지로 변환하고 핵심 데이터 저장 여부를 구분한다.

## 6. 확장 기준

- 신규 업무는 화면, API, 도메인 로직, DB 마이그레이션 순으로 책임을 분리한다.
- 외부 연동은 `src/lib`의 어댑터로 캡슐화한다.
- 운영 설정이 필요한 값은 환경변수 또는 시스템 설정 테이블로 관리한다.
