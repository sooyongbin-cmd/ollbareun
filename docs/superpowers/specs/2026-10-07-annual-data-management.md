# 자료관리

화면: `/manager/system/data-manage`. 시스템설정 바로 아래에 자료관리 메뉴를 배치한다.

연도 선택지는 `work_record.work_date`의 연도를 DISTINCT 오름차순으로 조회한다. 첫 진입 시 가장 최근 연도를 선택한다.

| 자료 | 테이블 | 연도 기준 |
| --- | --- | --- |
| 근태 | work_record | work_date |
| 휴가 | leave | start_date (사용자 확정) |
| 공휴일 | public_holidays | holiday_date |
| 교육 | education_completions | work_date |
| 점검지 | inspection_logs | inspected_at 한국 시간 |
| 특이사항 | inspection_special_reports | reported_at 한국 시간 |

자료삭제는 선택 연도의 삭제 확인 및 복구 불가 확인을 두 번 거친다. 처리 중 확인 모달을 유지하고 선택·삭제 입력을 잠근다. 완료 후 연도와 건수를 새로 조회한다.

서버에서 관리자 로그인, 연도 형식, 최종 확인과 요청 출처를 검증한다. DB RPC는 SECURITY INVOKER이며 service_role만 실행한다.

특이사항의 photo_url과 photo_urls를 모두 읽고 저장소 주소·버킷·경로를 검증한다. 중복 경로는 한 번 삭제하며 전체 페이지를 조회하고 사진 삭제를 배치 처리한다. 사진 삭제 실패 시 테이블 삭제는 시작하지 않는다.

사진 삭제 후 특이사항 행과 사진 목록이 바뀌었는지 DB에서 다시 확인한다. 바뀌었으면 테이블 삭제를 거부한다. 여섯 테이블의 삭제는 하나의 트랜잭션으로 처리한다. 근태 삭제에 따른 education_reminder_jobs의 기존 FK cascade는 유지한다.

Storage 삭제와 DB 트랜잭션은 하나의 원자적 작업이 아니다. 사진 삭제 도중 또는 이후 실패하면 일부 사진은 이미 삭제되었을 수 있음을 오류 메시지에 표시한다.

보관 보호 함수의 일반 동작은 유지한다. 연도 삭제 RPC가 service_role의 해당 트랜잭션에 지정한 연도만 허용하고, 종료 시 설정을 복원한다. 기존 트리거의 활성화·비활성화 상태는 변경하지 않는다.

검증: 권한·최종 확인·사진 삭제 순서·실패 중단·페이지 조회 테스트, 화면 이중 확인 및 메뉴 테스트, 합성 자료만 생성하는 DB 롤백 테스트(연도 경계, 기간 휴가, 다른 연도 보존, 보호 규칙, 권한).
