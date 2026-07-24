# 교육이수관리 교육알림 Push 기능 요약

## 기능 개요

`교육이수관리 > 교육알림` 버튼은 안전교육을 아직 완료하지 않은 직원에게 Web Push 알림을 보내는 기능입니다.

관리자 화면에서 버튼을 누르면 현재 조회 대상 직원 중 미이수 교육이 1건 이상 있는 직원만 골라 서버 API로 전달하고, 서버는 Supabase에 저장된 각 직원의 푸시 구독 정보를 사용해 알림을 발송합니다.

## 전체 흐름

1. 관리자 화면에서 `교육알림` 버튼 클릭
   - 파일: `src/app/manager/safety/completions/page.tsx`
   - 현재 검색 결과의 재직 직원 중 `미이수 건수 >= 1`인 사람만 발송 대상으로 선정합니다.
   - 대상 목록을 `/api/notifications/send`로 POST 요청합니다.

2. 서버 API에서 푸시 발송
   - 파일: `src/app/api/notifications/send/route.ts`
   - 환경변수 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`를 사용합니다.
   - Supabase `push_subscriptions` 테이블에서 대상 직원의 구독 정보를 조회합니다.
   - `web-push` 라이브러리로 푸시 알림을 발송합니다.

3. 직원/경비원 쪽 푸시 구독 등록
   - 파일: `src/app/guard/main/guard-push-register.tsx`
   - 경비원 메인 화면 진입 시 sessionStorage에서 직원 ID를 읽습니다.
   - 서비스워커를 등록하고 알림 권한을 요청합니다.
   - PushManager 구독 정보를 생성한 뒤 `/api/notifications/subscribe`로 저장 요청합니다.

4. 구독 정보 저장
   - 파일: `src/app/api/notifications/subscribe/route.ts`
   - `employee_id`, `endpoint`, `p256dh`, `auth`를 Supabase `push_subscriptions` 테이블에 upsert합니다.
   - 동일 직원의 같은 endpoint는 중복 저장되지 않습니다.

5. 서비스워커에서 알림 수신/클릭 처리
   - 파일: `src/app/sw.ts`
   - 푸시 수신 시 알림을 표시합니다.
   - 알림 클릭 시 `/guard/main`으로 이동합니다.
   - 앱이 foreground 상태이면 서비스워커 메시지를 통해 화면 내 모달도 띄울 수 있습니다.

## Supabase 테이블

관련 테이블은 `public.push_subscriptions`입니다.

주요 컬럼:

- `id`: 구독 레코드 ID
- `employee_id`: 직원 ID
- `endpoint`: 브라우저 푸시 endpoint
- `p256dh`: Push 암호화 공개키
- `auth`: Push 인증 secret
- `created_at`: 생성 시각
- `updated_at`: 갱신 시각

마이그레이션 파일:

- `supabase/migrations/202605300001_create_push_subscriptions.sql`

현재 확인된 Supabase 상태:

- `push_subscriptions` 테이블 존재
- 구독 데이터 1건 존재
- 등록 직원 수 1명

## 필요한 환경변수

`.env.local`에 아래 값이 필요합니다.

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=생성된_Public_Key
VAPID_PRIVATE_KEY=생성된_Private_Key
```

VAPID 키 생성 명령:

```bash
npx web-push generate-vapid-keys
```

주의:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`는 브라우저에 노출되는 공개키입니다.
- `VAPID_PRIVATE_KEY`는 서버 전용 비밀키이므로 GitHub에 커밋하면 안 됩니다.
- 환경변수를 추가하거나 수정한 뒤에는 Next.js 서버를 재시작해야 합니다.

## 로컬 테스트 시 주의사항

현재 `next.config.ts` 설정에서 Serwist 서비스워커는 개발 모드에서 비활성화되어 있습니다.

```ts
disable: process.env.NODE_ENV === "development"
```

따라서 `npm run dev` 상태에서는 `public/sw.js`가 생성되지 않아 새 브라우저/기기에서 푸시 구독 등록이 제대로 되지 않을 수 있습니다.

실제 푸시까지 검증하려면 다음 방식이 더 적합합니다.

```bash
npm run build
npm run start
```

또는 개발 중에만 Serwist disable 조건을 임시로 조정해야 합니다.

## 주요 에러와 원인

### `VAPID 키가 구성되지 않았습니다.`

원인:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 또는 `VAPID_PRIVATE_KEY`가 서버 실행 시점에 비어 있습니다.

해결:

- `.env.local`에 VAPID 키를 추가합니다.
- Next.js 개발 서버를 재시작합니다.

### `알림 미수신 대상 - 기기 미등록`

원인:

- 해당 직원의 푸시 구독 정보가 Supabase `push_subscriptions`에 없습니다.
- 직원이 모바일/브라우저에서 경비원 메인 화면에 접속하지 않았거나 알림 권한을 허용하지 않았을 수 있습니다.

해결:

- 직원이 지원 브라우저에서 `/guard/main`에 접속합니다.
- 알림 권한을 허용합니다.
- 구독 정보가 `push_subscriptions`에 저장되는지 확인합니다.

### 전송 실패

원인:

- 브라우저 endpoint 만료
- 기기 세션 만료
- Push 서비스 네트워크 오류

현재 구현:

- HTTP 404 또는 410 오류가 발생하면 만료된 endpoint로 판단하고 `push_subscriptions`에서 삭제합니다.

## 결론

이 기능은 구조상 이미 구현되어 있습니다. 정상 동작을 위해 필요한 조건은 다음과 같습니다.

1. VAPID 공개키/개인키가 환경변수에 설정되어 있어야 합니다.
2. Next.js 서버를 환경변수 반영 후 재시작해야 합니다.
3. 직원/경비원 브라우저에서 푸시 구독 등록이 완료되어야 합니다.
4. 로컬에서 실제 서비스워커까지 검증하려면 production 모드 실행이 필요합니다.
