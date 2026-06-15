# Web NFC 기반 현장점검 NFC 카드 쓰기 기능 구현 완료 보고서

현장상세 페이지에서 NFC URL을 NFC 카드 또는 스티커 태그에 웹 브라우저 상에서 직접 기록할 수 있도록 Web NFC API를 연동하고 타입 안전성을 확보하여 구현을 완료했습니다.

---

## 변경 사항 요약 (Summary of Changes)

### 1. 점검 현장 상세 화면 UI 및 핸들러 추가
* **수정 파일**: [page.tsx](file:///d:/ollba/ollba_20260610/src/app/manager/inspection/sites/[id]/page.tsx)
* **NFC 쓰기 버튼 추가**: NFC(URL) 다이얼로그의 복사 버튼과 닫기 버튼 사이에 "NFC 쓰기" 버튼을 추가했습니다.
* **NFC 쓰기 전용 다이얼로그 추가**: 쓰기 동작 시 인식 대기 중, 성공, 실패 피드백을 제공하는 모달을 추가했습니다.
* **NFC URL 레코드 포맷 적용**: 기존에 `text/plain` 텍스트 레코드 형식으로 기록되던 방식을 표준 NDEF URI 규격에 맞춰 `recordType: "url"` 형식의 구조화된 URL 레코드로 기록되도록 변경하였습니다. 이를 통해 스마트폰 카메라나 NFC 리더 앱이 태그 접촉 시 자동으로 웹 주소(URL)로 매핑하고 브라우저로 연결할 수 있도록 사용성을 극대화했습니다.
* **타입 안전성 보완**: `NDEFReader.write` 메소드가 문자열뿐 아니라 `{ records: Array<{ recordType: string, data: string }> }` 형태의 메시지 소스를 지원할 수 있도록 `declare global` 정의를 보완했습니다.

### 2. 단위 테스트 보완
* **수정 파일**: [page.test.tsx](file:///d:/ollba/ollba_20260610/src/app/manager/inspection/sites/[id]/page.test.tsx)
* **테스트 케이스 추가**:
  * 미지원 브라우저/장치에서 접근 시 오류 메시지 검증
  * `NDEFReader` 모킹 및 지연 프라미스(Deferred Promise)를 이용해 "인식 대기 중(scanning)" 및 "쓰기 완료(success)" 전환 흐름 검증
  * 쓰기 도중 에러가 발생한 상황과 취소 버튼 동작 검증

### 3. 빌드 에러 및 테스트 코드 타입 불일치 수정
* **수정 파일**:
  * [route.ts](file:///d:/ollba/ollba_20260610/src/app/api/notifications/send/route.ts): VAPID 키 검증 코드의 스코프 에러를 수정하여, 빌드 타임에 발생하던 에러를 방지했습니다.
  * [layout.test.tsx](file:///d:/ollba/ollba_20260610/src/app/manager/layout.test.tsx): `SuspendedManagerChild` 컴포넌트가 valid한 JSX 요소를 반환하도록 수정하여 타입 검사를 통과시켰습니다.
  * [new/page.test.tsx](file:///d:/ollba/ollba_20260610/src/app/manager/employee/worksites/new/page.test.tsx): Kakao Geocoder 모의(mock) 생성자의 타입 에러를 수정했습니다.
  * [navigation.test.tsx](file:///d:/ollba/ollba_20260610/src/app/guard/main/navigation.test.tsx): Geolocation Position 및 coords 스텁 객체의 타입 불일치(toJSON 누락 등)와 mock 호출부의 타입 추론 에러를 해결했습니다.

---

## 검증 결과 (Verification Results)

### 1. 자동화 테스트 수행 (Vitest)
새로 추가된 테스트를 포함해 프로젝트 내 모든 테스트 290건이 성공적으로 통과되었습니다.
```bash
npm test
# 결과: Test Files 89 passed (89), Tests 290 passed (290)
```

### 4. 자동알림(Edge Function) 오류 및 발송 실패 원인 로깅 개선
* **수정 파일**: [index.ts](file:///d:/ollba/ollba_20260610/supabase/functions/education-reminders/index.ts)
* **VAPID 키 런타임 오류 수정 및 배포**: 로컬 및 엣지 환경에서 `Vapid public key should be 65 bytes long when decoded` 오류를 발생시키던 잘못 구성된 VAPID 키셋을 `npx web-push generate-vapid-keys`로 생성한 정상적인 65바이트 EC 키 쌍으로 변경하고, 이를 Supabase Remote Secret 및 로컬 `.env.local`에 동기화 적용 후 Edge Function을 재배포(`education-reminders`)하였습니다.
* **실패 대상 개별 로깅 추가**: 자동알림 크론 동작 시, 전체 실행은 성공(`sent`)했으나 특정 직원으로의 푸시 알림 전송이 실패한 경우(예: 기기 세션 만료, 410 Gone 등) 개별 실패 원인을 취합하여 `error_message` 컬럼에 기록하도록 로직을 보완했습니다 (예: `홍길동: 기기 토큰 만료 또는 세션 만료 (HTTP 410)`). 이를 통해 관리자 화면(`/manager/safty/notifications`)의 "오류내용" 컬럼에서 개별 실패 원인을 투명하게 확인할 수 있습니다.

---

## 검증 결과 (Verification Results)

### 1. 자동화 테스트 수행 (Vitest)
모든 테스트 290건이 성공적으로 통과되었습니다.
```bash
npm test
# 결과: Test Files 89 passed (89), Tests 290 passed (290)
```

### 2. 빌드 검증 (`npm run build`)
```bash
npm run build
# 결과: Compiled successfully, Running TypeScript (Finished TypeScript in 17.2s), Generating static pages (76/76) 완료
```

### 3. 코드 푸시 완료 (Git Push)
```bash
git push origin main
# 결과: To https://github.com/sooyongbin-cmd/ollbareun  main -> main (17ff3c7..2f6d763)
```

---

# 특이사항 보고 시 GPS 정보 수집 및 표출 기능 구현 완료 보고서

특이사항 이메일 보고 시(Formspree 및 Resend 방식 모두) 모바일 디바이스 또는 브라우저의 GPS(위도, 경도)를 수집하여 Supabase DB에 저장하고, 관리자용 특이사항 상세 화면에 해당 좌표를 표출하도록 구현했습니다.

## 변경 사항 요약 (Summary of Changes)

### 1. 특이사항 작성 페이지 (현장점검자 화면)
* **수정 파일**: [page.tsx](file:///d:/ollba/ollba_20260610/src/app/guard/main/special-remarks/page.tsx)
* **GPS 데이터 수집**: `navigator.geolocation.getCurrentPosition`을 통해 보고 시각의 위도/경도를 비동기적으로 추출합니다.
* **대기 시간 및 예외 처리**: GPS 수집 과정에서 딜레이로 제출이 지연되는 것을 막기 위해 6초(`timeout: 6000`) 제한을 두었습니다. GPS 권한 거부나 신호 불량 등으로 실패할 경우 로그 경고를 출력하며 위치 정보 없이(null) 정상 보고가 완료되도록 견고하게 구현했습니다.

### 2. 특이사항 보고 DB 레이어 및 API
* **수정 파일**: [special-remark-reports.ts](file:///d:/ollba/ollba_20260610/src/lib/special-remark-reports.ts)
* **스키마 모델링**: `SpecialRemarkReportRow` 타입 정의에 `gps_info`를 추가하였고, Supabase 테이블 `inspection_special_reports`에 JSONB 형태로 GPS 값을 안정적으로 바인딩하여 Insert 합니다.

### 3. 특이사항 상세 화면 (관리자 화면)
* **수정 파일**: [page.tsx](file:///d:/ollba/ollba_20260610/src/app/manager/inspection/special-remarks/[id]/page.tsx)
* **GPS 정보 렌더링**: 관리자 화면에서 해당 특이사항을 검토할 때 점검일시 및 점검자와 함께 **보고 위치 (GPS)** 정보를 한눈에 확인할 수 있도록 메타데이터 영역에 3열 그리드로 추가하였습니다. 위치 정보가 존재할 경우 소수점 6자리까지 표출하며, 없을 경우 `기록 없음`으로 표시합니다.

### 4. 단위 테스트 작성 및 보완
* **수정 파일**: 
  - [page.test.tsx](file:///d:/ollba/ollba_20260610/src/app/guard/main/special-remarks/page.test.tsx): GPS 정보가 성공적으로 수집되어 Formspree API 엔드포인트 바디에 정상 포함되어 발송되는지 테스트하는 모킹 케이스를 추가했습니다.
  - [special-remark-reports.test.ts](file:///d:/ollba/ollba_20260610/src/lib/special-remark-reports.ts): DB 저장 단계에서 `gps_info` 필드가 포함되어 insert query로 유입되는지 검증하였습니다.
  - [page.test.tsx](file:///d:/ollba/ollba_20260610/src/app/manager/inspection/special-remarks/[id]/page.test.tsx): 관리자 상세 화면 조회 시 GPS 정보 유무에 따라 위도/경도 텍스트가 정확히 바인딩되거나 `기록 없음`이 노출되는지 검증하는 테스트 케이스를 설계했습니다.

---

## 검증 결과 (Verification Results)

### 1. 자동화 테스트 수행 (Vitest)
새로 작성된 3개의 테스트를 포함해 프로젝트 내 모든 테스트 293건이 성공적으로 통과되었습니다.
```bash
npm test
# 결과: Test Files 89 passed (89), Tests 293 passed (293)
```

### 2. 빌드 검증 (`npm run build`)
```bash
npm run build
# 결과: Compiled successfully, Running TypeScript (Finished TypeScript in 14.6s), Generating static pages (76/76) 완료
```

### 3. 코드 푸시 완료 (Git Push)
```bash
git push origin main
# 결과: To https://github.com/sooyongbin-cmd/ollbareun main -> main (2f6d763..6d5dd92)
```

---

# 자동 알림 Edge Function 내 HTTP 403 오류 해결 보고서

## 원인 분석 (Root Cause Analysis)

- **상황**: Next.js 어플리케이션 백엔드에서 전송하는 "교육알림" 버튼 클릭(수동 발송) 시에는 푸시 알림이 정상적으로 수신되나, Supabase pg_cron을 통해 실행되는 `education-reminders` Edge Function(자동 발송) 시에는 `HTTP 403 Forbidden` 네트워크/서버 오류가 로깅되었습니다.
- **원인**: Deno 런타임 환경에서 Node.js용 `web-push` npm 패키지를 `npm:web-push` 형태로 가져와 사용할 때 발생한 문제입니다. `web-push` 패키지는 Node.js의 내장 `crypto` 모듈(`crypto.sign` 및 `crypto.createSign` 등)을 사용하여 VAPID Authorization 헤더(JWT)를 서명합니다. Deno의 Node.js 호환성 레이어가 이를 에뮬레이트하여 처리하지만, 이 과정에서 암호화 서명 알고리즘(P-256 ECDSA)의 서명 인코딩 값이 미세하게 어긋나게 서명되어 브라우저 푸시 서비스(FCM/Google)에서 서명 검증에 실패하여 `403 Forbidden`을 반환하게 된 것입니다. Node.js 네이티브 환경(Next.js 백엔드)에서는 정상 작동하여 수동 발송 시에는 문제없이 동작한 이유이기도 합니다.

## 해결 방법 및 조치 내용 (Resolution & Implementation Details)

### 1. Deno 호환 크로스플랫폼 Web Push 라이브러리로 대체
- **수정 파일**: 
  - [deno.json](file:///d:/ollba/ollba_20260610/supabase/functions/education-reminders/deno.json)
  - [index.ts](file:///d:/ollba/ollba_20260610/supabase/functions/education-reminders/index.ts)
- Deno 및 Web Standard 암호화 API(Web Crypto API)를 사용하는 크로스플랫폼 라이브러리인 `@block65/webcrypto-web-push` (v1.0.2)로 의존성을 교체하였습니다.
- 이 라이브러리는 특정 런타임 내장 `crypto`에 종속되지 않고 글로벌 `SubtleCrypto`를 사용하여 Deno 환경에서도 정확하고 호환성 있는 VAPID 서명과 암호화 페이로드를 생성합니다.

### 2. Edge Function 전송 핸들러 및 fetch 구조 개선
- [index.ts](file:///d:/ollba/ollba_20260610/supabase/functions/education-reminders/index.ts) 내에서 VAPID 세팅을 전역에 강제하던 `webpush.setVapidDetails` 대신, `buildPushPayload`를 호출하여 표준 Web Request 옵션 형태의 페이로드를 생성하고 Deno 네이티브 `fetch`를 이용하여 푸시 서비스를 호출하도록 변경했습니다.
- 전송 실패 시, 에러 응답 코드를 잡아 `getErrorReason`에 원인이 명확히 기재될 수 있도록 `{ statusCode: res.status }` 형태의 에러 발생 처리 로직을 더해 에러 추적성을 높였습니다.

### 3. Supabase Edge Function 원격 배포 완료
- 수정된 엣지 함수 코드를 리모트 Supabase 프로젝트(`wexcijqchwwkxpkwajbf`)에 정상적으로 배포 및 동기화하였습니다.
```bash
npx supabase functions deploy education-reminders --project-ref wexcijqchwwkxpkwajbf
# 결과: Deployed Functions on project wexcijqchwwkxpkwajbf: education-reminders
```

---

## 검증 결과 (Verification Results)

* **Supabase Edge Function 배포**: 성공
* **Git Commit & Push**: `main` 브랜치로 병합 및 푸시 완료 (`6d5dd92..fbe73b3`)

---

# 특이사항 이메일 템플릿(Formspree & Resend) 내 GPS 정보 포함 기능 구현 완료 보고서

## 변경 사항 및 조치 내용 (Resolution & Implementation Details)

- **상황**: 특이사항 발생 시 수집된 GPS 정보가 데이터베이스(`inspection_special_reports`)에는 올바르게 저장되고 있었으나, Formspree 및 Resend(이메일)를 통해 발송되는 이메일 본문과 텍스트 메시지에는 포함되지 않고 있었습니다.
- **수정 파일**: [special-remark-reports.ts](file:///d:/ollba/ollba_20260610/src/lib/special-remark-reports.ts)
- **조치 내용**:
  1. `buildEmailHtml` 함수가 `gpsInfo`를 전달받아, 이메일 내역에 **보고 위치 (GPS)** 항목으로 `위도, 경도` 정보를 표출할 수 있도록 템플릿 구조를 변경했습니다. (GPS 정보가 없을 경우 `기록 없음` 표출)
  2. `buildFormspreeMessage` 함수 역시 `gpsInfo` 매개변수를 갖도록 확장하고, Formspree로 전송되는 텍스트 본문 리스트에 `보고위치 (GPS): 위도, 경도` 포맷을 추가했습니다.
  3. `createSpecialRemarkReport` 메인 함수에서 DB에 최종 입력되는 `gps_info` 객체를 이메일 전송 함수의 인자인 `emailInput`에 `gpsInfo`라는 이름으로 올바르게 패싱하도록 맵핑 관계를 추가 및 연동했습니다.

---

## 검증 및 배포 결과 (Verification Results)

* **TypeScript 컴파일 검사**: `npx tsc --noEmit` 성공 (오류 없음)
* **단위 테스트 검증**: Vitest 테스트 294건 모두 통과 완료 (`npm test`)
* **생산 빌드 검증**: `npm run build` 컴파일 성공
* **Git Commit & Push**: `main` 브랜치로 푸시 완료 (`55f0016..47ffd8b`)

---

# 특이사항 보고 후 복귀 화면 이동 처리 기능 구현 완료 보고서

## 변경 사항 및 조치 내용 (Resolution & Implementation Details)

- **상황**: 특이사항 작성 및 성공 전송 시 표시되는 성공 알림 모달(AlertModal)을 닫거나 확인했을 때, 페이지가 그대로 유지되는 대신 경비원 메인 화면(`/guard/main`)으로 정상 복귀할 수 있도록 제어 흐름 수정이 필요했습니다.
- **수정 파일**:
  - [page.tsx](file:///d:/ollba/ollba_20260610/src/app/guard/main/special-remarks/page.tsx)
  - [page.test.tsx](file:///d:/ollba/ollba_20260610/src/app/guard/main/special-remarks/page.test.tsx)
- **조치 내용**:
  1. **페이지 로직 보완**: `GuardSpecialRemarksPage` 내 `useRouter`를 사용해 `AlertModal`의 `onClose` 핸들러에서 `setAlertMessage("")` 처리 후 `router.push("/guard/main")`를 호출하여 이전 메인 화면으로 리다이렉트하도록 수정했습니다.
  2. **테스트 코드 보완**: `next/navigation`의 `useRouter`를 모킹(`push` spy 함수 제공)하고, Formspree 전송 성공 시나리오(`submits the special remark report through Formspree`, `submits the special remark report with GPS coordinates if geolocation is available`)에 "확인" 버튼 클릭 및 `expect(push).toHaveBeenCalledWith("/guard/main")` 검증 단계를 추가하여 기능의 정상 작동 여부를 자동 검증하도록 개선했습니다.

---

## 검증 및 배포 결과 (Verification Results)

* **TypeScript 컴파일 검사**: `npx tsc --noEmit` 성공 (오류 없음)
* **단위 테스트 검증**: Vitest 테스트 294건 모두 통과 완료 (`npm test`)
* **생산 빌드 검증**: `npm run build` 컴파일 성공

