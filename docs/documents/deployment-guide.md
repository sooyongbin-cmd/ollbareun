# 올바름 인력관리시스템 배포 가이드

## 1. 배포 구성

- 애플리케이션: Vercel deployment server
- 데이터베이스·인증·저장소: Supabase
- 정기 작업: Supabase Cron 및 Edge Function
- 외부 연동: Kakao 지도, 도로명주소, Naver mail, Web Push

## 2. 사전 준비

### 1. 데이터베이스 이전 (Supabase)

1. (소유자) Supabase 사이트에서 신규 가입하고 이메일과 비밀번호를 생성한다.
2. 로그인한 뒤 좌측의 **Team** 메뉴를 선택한다.
3. **Invite members**를 선택한다.
4. **Email address**에 개발자 이메일 `sooyongbin@gmail.com`을 입력한다.
5. 개발자가 초대를 확인한다.
6. (소유자) **Team** 메뉴의 member 목록에 개발자가 나타나는지 확인한다.
7. **Manage access**에서 개발자 권한을 **Developer**에서 **OWNER**로 변경한다.
8. (개발자) **Transfer project**를 진행한다. 이전 후에도 프로젝트를 조회할 수 있다.

### 2. 운영(배포) 서버 (Vercel)

1. 새로운 계정 ID로 신규 가입한다.
2. GitHub를 연결하고 프로젝트를 생성한다. https://github.com/sooyongbin-cmd/ollbareun
3. **Settings → Build and Deployment → [Deployment Retention Policy](https://vercel.com/dev02-c7ef/~/settings/build-and-deployment#deployment-retention-policy)**에서 보관 정책을 1day 로 조정한다.
4. Supabase의 **Authentication → URL Configuration → Redirect URLs**에 새 Vercel 주소의 `/auth/callback`을 허용한다.
5. Supabase service key는 **Project Settings → API Keys**에서 확인한다. Vercel 서버 환경변수에만 등록하고 문서나 Git 저장소에는 기록하지 않는다.

### 3. 계정 및 설정 관리

- 관리자 계정은 업무상 필요한 사용자만 등록한다.
- 담당자 변경 또는 퇴사 시 관리자 계정을 즉시 정리한다.
- 시스템 설정 코드는 운영 기능에서 참조하므로 의미를 확인한 후 수정한다.
- 비밀번호와 서비스 키는 문서나 메신저에 평문으로 공유하지 않는다.

#### 3.1 네이버 메일 발신 계정 등록 및 변경

특이사항 보고에 사용할 네이버 발신 계정을 새로 등록하거나 교체할 때 다음 순서로 진행한다. 현재 구현에서는 코드 수정 없이 네이버 계정 설정과 Vercel 환경변수 변경으로 적용할 수 있다.

##### 1. 네이버 2단계 인증과 애플리케이션 비밀번호 준비

1. 발신용 네이버 계정으로 로그인한다.
2. 네이버 계정의 보안설정에서 2단계 인증을 활성화한다.
3. 애플리케이션 비밀번호를 발급한다. SMTP 인증에는 일반 로그인 비밀번호가 아닌 이 비밀번호를 사용한다.

네이버는 2025년 6월 24일부터 외부 메일 연동에 2단계 인증과 애플리케이션 비밀번호를 요구한다. 자세한 절차는 [네이버 공식 FAQ](https://help.naver.com/service/30029/contents/24347?lang=ko&osType=COMMONOS)를 참고한다.

##### 2. 네이버 메일에서 SMTP 사용 허용

1. PC 네이버 메일의 **환경설정 → POP3/IMAP 설정 → POP3/SMTP 설정**으로 이동한다.
2. **POP3/SMTP 사용**을 **사용함**으로 변경하고 저장한다.
3. SMTP 서버는 `smtp.naver.com`, 포트는 `465`, 보안 연결은 SSL을 사용한다.

[네이버 SMTP 설정 안내](https://help.naver.com/service/30029/contents/21341?lang=ko&osType=PC)

##### 3. Vercel 환경변수 등록

Vercel의 해당 프로젝트에서 **Settings → Environment Variables**로 이동하여 아래 값을 등록하거나 변경한다. 운영 사이트에는 **Production** 환경으로 적용한다.

| 환경변수 | 입력할 값 | 비고 |
| --- | --- | --- |
| `NAVER_SMTP_USER` | 새 발신 계정 이메일, 예: `example@naver.com` | 필수 |
| `NAVER_SMTP_PASSWORD` | 네이버에서 발급한 애플리케이션 비밀번호 | 일반 로그인 비밀번호 사용 불가 |
| `NAVER_SMTP_PORT` | `465` | 필수. 현재 코드는 이 포트에서 SSL 사용 |
| `NAVER_SMTP_FROM` | 새 발신 계정 이메일 | 생략하면 `NAVER_SMTP_USER` 사용. 계정 교체 시 기존 주소가 남지 않도록 확인 |

애플리케이션 비밀번호는 환경변수로만 저장하며 GitHub 코드, 프로젝트 문서, 메신저에 기록하지 않는다. SMTP 서버 주소는 코드에서 `smtp.naver.com`으로 지정되어 있으므로 별도 환경변수를 추가할 필요가 없다.

##### 4. 보고서 수신 주소 설정

1. [관리자 시스템설정](https://ollbareun.vercel.app/manager/system/configs)으로 이동한다.
2. 시스템코드 **`manager_email`**의 내용을 보고서를 받을 이메일 주소로 설정한다.

발신 계정은 Vercel 환경변수에서, 수신 주소는 시스템설정의 `manager_email`에서 관리한다. 수신 주소만 변경한다면 네이버 발신 계정을 새로 등록하거나 SMTP 환경변수를 변경할 필요가 없다.

##### 5. 재배포 및 수신 확인

1. 환경변수 저장 후 Vercel에서 **Redeploy**를 실행한다. 환경변수 변경은 새 배포부터 적용된다. [Vercel 환경변수 안내](https://vercel.com/docs/environment-variables)
2. 배포 완료 후 근무자의 **특이사항** 화면에서 테스트 보고를 작성한다. 관리자에게 테스트임을 알 수 있도록 내용에 **메일 설정 테스트**를 명시한다.
3. **보고하기**를 누르고 완료 안내에서 NAVER 이메일 발송 결과를 확인한다.
4. `manager_email`에 설정한 수신 계정의 받은편지함과 스팸함에서 실제 수신 여부를 확인한다.

현재 **보고하기**는 보고서를 한 번 저장한 뒤 관리자 푸시알림 전송을 시도하고, 이어서 NAVER 이메일을 전송한다. 따라서 테스트 보고도 관리자 푸시알림이 함께 발송된다. 푸시 전송 실패 시에도 이메일 발송은 시도하며, 완료 안내에서 두 결과를 각각 확인할 수 있다.

##### 발송 실패 시 확인 사항

- 네이버 계정의 2단계 인증 및 POP3/SMTP 사용 설정을 확인한다.
- `NAVER_SMTP_PASSWORD`에 유효한 애플리케이션 비밀번호가 입력되어 있는지 확인한다.
- `NAVER_SMTP_USER`와 `NAVER_SMTP_FROM`이 새 발신 계정으로 설정되어 있는지 확인한다.
- `NAVER_SMTP_PORT`가 `465`인지, 환경변수가 Production에 적용되어 있는지 확인한다.
- 환경변수 변경 후 재배포했는지 확인한다.
- `manager_email`의 수신 주소, 스팸함 및 Vercel 오류 로그를 확인한다.

#### 3.2 공휴일 정보 API 신청 및 설정

1. [공공데이터포털 한국천문연구원 특일 정보](https://www.data.go.kr/data/15012690/openapi.do)에 접속하고 로그인합니다.
2. **활용신청**을 선택하여 사용 목적과 필요한 신청 항목을 입력합니다. 신청한 서비스의 승인 상태와 이용 가능한 호출 한도를 확인합니다.
3. 마이페이지의 OpenAPI 활용 내역에서 해당 서비스의 **일반 인증키(Decoding)**를 확인합니다. 인증키는 공개 문서나 GitHub에 올리지 않습니다.
4. Vercel 프로젝트의 Settings → Environment Variables에 서버 환경변수 **DATA_GO_KR_SERVICE_KEY**를 만들고 인증키를 값으로 등록합니다. 운영 서비스는 Production 환경에 적용합니다. 변수 이름에 NEXT_PUBLIC_을 붙이지 않습니다.
5. 환경변수를 저장한 뒤 재배포(Redeploy)합니다. 로컬 개발 시에는 같은 변수를 커밋하지 않는 .env.local에 설정합니다.
6. 관리자 → 직원관리 → **공휴일관리**에서 연도를 입력하고 **공휴일가져오기**를 누릅니다. 확인창에서 해당 연도를 확인하고 승인합니다.

공휴일 조회 기능(getRestDeInfo)으로 해당 연도의 자료를 받아 공휴일 여부가 Y인 날짜만 저장합니다. 신규 날짜의 선택값은 Y이며, 이미 존재하는 날짜는 수정하지 않고 건너뜁니다. 다시 가져와도 기존 이름과 선택값은 유지됩니다. 결과 메시지에서 등록 건수와 건너뛴 건수를 확인합니다.

목록의 **선택** 체크박스를 변경하면 Y/N 값이 즉시 저장됩니다. **휴일추가**에서는 날짜를 입력하여 선택값 Y로 직접 등록할 수 있습니다. 중복 날짜는 등록되지 않습니다. 공휴일 선택값은 야간근무(2)의 배정 저장 시 일정 생성에 자동 반영됩니다. 선택값이 `Y`인 공휴일은 주말과 같은 휴무일 기준으로 처리됩니다. 일반근무(0)와 격일근무(1)은 공휴일·주말을 자동 휴무로 처리하지 않으므로 필요한 경우 **근무지배정 상세** 화면에서 휴무일을 수동 지정합니다.

인증키가 없으면 설정 안내가 표시됩니다. 가져오기 실패 시 활용승인 여부, 인증키, 요청 한도, 공공데이터포털 서비스 상태를 확인합니다. 임시공휴일 등 변경 사항이 발표되면 해당 연도를 다시 가져오고, 기존 자료의 변경이 필요한 경우에는 선택값을 직접 조정합니다. API 등록 정보와 제공 범위는 공공데이터포털의 최신 안내를 기준으로 확인합니다.

#### 3.3 교육 알림 Cron 작업 등록 위치

교육 알림 자동 발송을 위한 Supabase Cron 작업은 다음 메뉴에서 등록·수정하고 활성화 상태를 확인한다.

- 메뉴 : Integrations - Cron

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
