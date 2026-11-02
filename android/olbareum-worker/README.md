# �ùٸ� �ٹ��� ? �ű� TWA Android ��

- ���� �ּ�: https://www.olbareum.com/guard
- �� �̸�: �ùٸ� �ٹ���
- �ű� applicationId: `com.olbareum.worker` (Play Console ���� ��� �� �ߺ� ���� Ȯ��)
- Android 6.0 �̻�, compile/target SDK 36, Java 17
- Android Gradle Plugin 8.10.1, Gradle 8.11.1, Android Browser Helper 2.6.2
- ���� `android/guard-twa`�� �� ������Ʈ�� ���� �Է��� �ƴմϴ�. ȸ�� �ΰ� �̹��� �ڻ길 �����մϴ�.
- WebView�� �ƴ� TWA�̸�, ���� �̿Ϸ� �Ǵ� ������ ������������ Custom Tab���� �����ϴ�.
- �� ��Ű���� ���� ���� �������� ���� �����Ƿ� assetlinks�� ��¥ ������ ���� �ʾҽ��ϴ�.

## 1. ���� ����

JDK 17, Gradle 8.11.1, Android SDK platform 36 / build-tools 35.0.0�� ��ġ�ϰ� ANDROID_HOME�� �����մϴ�.
Gradle ��ġ�� ���� ������ �Ǵ� Android Studio�� ����մϴ�. �� ������Ʈ�� ���� Gradle�� ����ϸ� wrapper�� �������� �ʽ��ϴ�.

����� ��Ʈ����:

```sh
node --test android/olbareum-worker/scripts/assetlinks.test.mjs
gradle -p android/olbareum-worker lintDebug assembleDebug
```

����� APK: `android/olbareum-worker/app/build/outputs/apk/debug/app-debug.apk`.
����� �������δ� Play ���� �Ұ�. ����� �������� ������ �������� ������ �ּ�â�� ������ ���� �����Դϴ�.
CI�� ����� Ű�� ���ึ�� �޶��� �� �����Ƿ� � assetlinks�� �߰����� �ʽ��ϴ�.

## 2. �� ���ε� Ű�� ������ AAB

���� Ű�� ������� �ʽ��ϴ�. ������ ���� ��ο��� ���ε� Ű�� �� �� �����ϰ� ����մϴ�.
��й�ȣ�� ���� ���ڷ� ���� �ʰ� keytool ������Ʈ���� �Է��մϴ�.

```sh
keytool -genkeypair -keystore olbareum-worker-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

���� ȯ�溯���� �����մϴ�. �����, �α�, PR �Ǵ� ������ ��й�ȣ�� Ű�� �ø��� �ʽ��ϴ�.

- TWA_KEYSTORE_PATH: Ű ������ ���� ���
- TWA_KEYSTORE_PASSWORD
- TWA_KEY_ALIAS: upload
- TWA_KEY_PASSWORD

```sh
gradle -p android/olbareum-worker bundleRelease -PversionCode=1 -PversionName=1.0.0
```

AAB: `app/build/outputs/bundle/release/app-release.aab` (������Ʈ ���� ����).
�������� ������ release APK/AAB ���带 ���н��� �Ǽ��� �̼��� ���� �������� �ʵ��� �մϴ�.
������Ʈ �� versionCode�� �ݵ�� ������ŵ�ϴ�.

## 3. Google Play �� ������ ������ ����

1. Play Console���� �� ���� ����� ���� ������ AAB�� ���� �׽�Ʈ�� ���ε��մϴ�.
2. Play �� ���� ��� ���� �� **�� ���Ἲ �� �� ���� Ű ������ �� SHA-256**�� Ȯ���մϴ�.
3. ���ε� Ű�� Play �� ���� Ű�� �ٸ� �� �ֽ��ϴ�. ���� ��ġ�� APK�� ������ �´� ������ �ʿ��մϴ�.
4. ����� ��Ʈ���� ���� ������ �����մϴ�. ���� ���� �� ���� �������� ǥ�õǸ� ��� ������ �� �ֽ��ϴ�.

```sh
node android/olbareum-worker/scripts/assetlinks.mjs "���� SHA-256 ����"
```

5. ����� `public/.well-known/assetlinks.json`�� ���䡤�����մϴ�. ���� �� �׸��� �����˴ϴ�.
6. https://www.olbareum.com/.well-known/assetlinks.json �� �α���/�����̷�Ʈ ���� HTTPS 200 JSON���� Ȯ���մϴ�.
7. Play ���� �׽�Ʈ�� ��ġ�� �ּ�â ���� ����, App Links, �˸��� Ȯ���մϴ�.

`www.olbareum.com`�� �������� ���������� �ٸ� ȣ��Ʈ�� �ŷ� ��Ͽ� ���Ƿ� �߰����� �ʽ��ϴ�.
���� ��������ó����ħ �̵� �� /guard ���� �� ��ũ�� ������ ǥ�ð� �޶��� �� �ֽ��ϴ�.

## 4. ��� �� ���� ��� Ȯ��

- ��ġ��ù ���ࡤ����ࡤ�ڷΰ��⡤�α׾ƿ������� ����
- ȸ�簡 �߱��� �ɻ�� ������ �α���, ���� � �����Ϳ� �и�
- �����, ��ġ ���/����, ���� ��� �� ����, ���� ÷��, QR, ���� �Է�(��� ��ɺ�)
- �˸� ���/����, ��׶��� �˸� ���š�Ŭ��, �α׾ƿ� �� ���� ����
- īī�� ���� ������ ���, �� �������� Ǫ�� ���� ����, ���� CORS/��Ű/���� ��ũ
- �������� �ȳ� �� �翬��, �� ��ũ /guard �� /guard/���� ���
- �̸�/��ȭ��ȣ �� �ΰ��� ���� �αס���ũ������ ������ �ʱ�
- �� ������ ������ ����Ʈ ������/���� ��� ������ �������� ����

��ġ��ī�޶󡤸���ũ�� �� ����� �ʿ� �� ������ ������ ��û�մϴ�. ����Ƽ�� ��׶��� ��ġ ������ �߰����� �ʾҽ��ϴ�.
Web NFC �� �������� ���� ����� TWA���� �Ǳ��� ���� ���θ� Ȯ���ؾ� �մϴ�.

## ���� �̿Ϸ� ����

- ���� main�� /guard ������ �̸�+����ó�Դϴ�. �䱸������ ID+��й�ȣ�� ����ġ�մϴ�.
  ������������ ���� �߱ޡ�DB ������ ���� ������ Ȯ���ؾ� �ϸ�, TWA�� �̸� ID/��й�ȣ �������� �ٲ����� �ʽ��ϴ�.
- �� ��Ű���� ���� ���ε� Ű/Play �� ���� �������� ���� ���� ���� AAB�� � ������ ������ �Ϸ���� �ʾҽ��ϴ�.
- GitHub CI ������ �Ǳ�� �α��Ρ���ġ���˸��̳� Google �ɻ� ����� �������� �ʽ��ϴ�.
