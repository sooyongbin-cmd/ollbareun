# 올바름 근무자 — 신규 TWA Android 앱

- 실행 주소: https://www.olbareum.com/guard
- 앱 이름: 올바름 근무자
- 신규 applicationId: `com.olbareum.worker` (Play Console 최초 등록 시 중복 여부 확인)
- Android 6.0 이상, compile/target SDK 36, Java 17
- Android Gradle Plugin 8.10.1, Gradle 8.11.1, Android Browser Helper 2.6.2
- 기존 `android/guard-twa`는 빌드 입력이 아닙니다. 회사 로고 이미지 자산만 재사용합니다.
- WebView가 아닌 TWA입니다. 검증 미완료 또는 미지원 브라우저에서는 Custom Tab으로 열립니다.
- 새 패키지의 서명 인증서가 아직 없으므로 assetlinks에 가짜 지문을 넣지 않았습니다.

## 1. 개발 빌드

JDK 17, Gradle 8.11.1, Android SDK platform 36 및 build-tools 35.0.0을 설치하고 ANDROID_HOME을 설정합니다.
공식 Gradle 설치판을 사용하며 이 프로젝트에 wrapper는 포함하지 않습니다.
저장소 루트에서 다음 명령을 실행합니다.

```sh
node --test android/olbareum-worker/scripts/assetlinks.test.mjs
gradle -p android/olbareum-worker lintDebug assembleDebug
```

설치용 디버그 APK: `android/olbareum-worker/app/build/outputs/apk/debug/app-debug.apk`.
디버그 서명으로 Play 제출은 불가합니다.
도메인 인증 전 주소창이 나오는 것은 정상이며 실제 TWA 동작 완료를 뜻하지 않습니다.
CI의 디버그 키는 실행마다 달라질 수 있으므로 운영 assetlinks에 추가하지 않습니다.

## 2. 새 업로드 키와 서명 AAB

안전한 별도 경로에서 새 업로드 키를 한 번 생성하고 백업합니다.
비밀번호는 명령 인자에 넣지 않고 keytool 프롬프트에서 입력합니다.

```sh
keytool -genkeypair -keystore olbareum-worker-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

다음 환경변수를 설정합니다. 키와 비밀번호를 저장소, 로그, PR에 올리지 않습니다.

- TWA_KEYSTORE_PATH: 키 파일의 절대 경로
- TWA_KEYSTORE_PASSWORD
- TWA_KEY_ALIAS: upload
- TWA_KEY_PASSWORD

```sh
gradle -p android/olbareum-worker bundleRelease -PversionCode=1 -PversionName=1.0.0
```

AAB: 프로젝트 기준 `app/build/outputs/bundle/release/app-release.aab`.
서명 설정이 없으면 release APK/AAB 빌드를 실패시킵니다. 업데이트 시 versionCode를 증가시킵니다.

## 3. Play 앱 서명과 도메인 인증

1. Play Console에서 새 앱을 생성하고 최초 서명 AAB를 내부 테스트로 업로드합니다.
2. Play 앱 서명 설정 후 앱 무결성 → 앱 서명 키 인증서 → SHA-256을 확인합니다.
3. 업로드 키와 Play 앱 서명 키는 다를 수 있습니다. 설치된 앱의 실제 서명에 맞춰야 합니다.
4. 저장소 루트에서 아래 명령에 실제 지문을 전달합니다. 여러 앱 서명 인증서가 필요하면 모두 인자로 전달합니다.

```sh
node android/olbareum-worker/scripts/assetlinks.mjs "실제 SHA-256 지문"
```

5. 변경된 `public/.well-known/assetlinks.json`을 검토·배포합니다. 다른 앱의 항목은 보존됩니다.
6. https://www.olbareum.com/.well-known/assetlinks.json 이 로그인·리다이렉트 없이 HTTPS 200 JSON을 반환하는지 확인합니다.
7. Play 내부 테스트 설치본으로 주소창 없는 실행, App Links, 알림을 검증합니다.

설정 호스트는 www.olbareum.com이며 다른 호스트는 신뢰 목록에 추가하지 않았습니다.
개인정보처리방침 등 /guard 밖 링크에서는 브라우저 표시가 달라질 수 있습니다.

## 4. 실제 기기 검증

- 설치, 첫 실행, 재실행, 뒤로가기, 로그아웃, 세션 만료
- 회사 발급 심사용 계정으로 로그인 및 운영 데이터와의 분리
- 출퇴근, 위치 허용·거절, 업무 기록, 보고와 사진 첨부
- QR·음성 입력·NFC 등 실제 사용하는 기능의 브라우저별 지원
- 알림 허용·거절, 백그라운드 수신·클릭, 로그아웃 후 구독 정리
- 새 도메인의 카카오 지도 등록·푸시 구독·쿠키·서버 링크 설정
- 오프라인 안내 및 재연결, /guard 와 /guard/하위 경로 앱 링크
- 개인정보처리방침 공개 접근 및 사용자 데이터 노출 여부

위치·카메라·마이크는 필요 시 웹 기능이 브라우저 권한을 요청합니다.
네이티브 백그라운드 위치 권한은 추가하지 않았습니다.
앱 삭제와 브라우저 사이트 데이터·서버 기록 삭제는 동일하지 않습니다.

## 남은 단계

최신 main의 로그인 화면은 ID·비밀번호입니다. API에는 기존 name/phone 필드로 전달하며 비밀번호에서 숫자 외 문자를 제거합니다.
화면 명칭 변경과 별도의 ID·비밀번호 인증 체계는 구분해야 합니다. 이 프로젝트는 서버 인증 체계를 변경하지 않습니다.
새 업로드 키·Play 앱 서명 인증서, 서명 AAB, 운영 인증, 실기기 검증 및 Play 제출은 아직 완료되지 않았습니다.
CI 성공만으로 로그인·위치·알림 정상 동작 또는 Google 심사 통과를 주장하지 않습니다.
