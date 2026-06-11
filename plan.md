# 직원명부관리 페이지 구현 계획

> **에이전트 작업자 가이드:** 필수 하위 기술: 이 계획을 작업 단위별(task-by-task)로 구현하기 위해 superpowers:subagent-driven-development(권장) 또는 superpowers:executing-plans를 사용하십시오. 진행 상황은 체크박스(`- [ ]`) 구문을 사용하여 추적합니다.

**목표:** `screen-design.md`에 정의된 `직원명부관리` 화면을 독립적인 라우트(route)로 생성하고, 관리자 메뉴에서 직접 이동할 수 있도록 연결한다.

**아키텍처:** 기존 `Phase1App`의 bootstrap 기반 데이터 흐름을 그대로 재사용한다. 새로운 라우트 `/manager/employee/employees`는 전용 page 파일에서 `Phase1App`의 새로운 관리자 뷰(manager view)를 렌더링하며, 목록 필터링은 클라이언트 상태에서만 처리한다. 메뉴 링크는 기존 관리자 사이드바의 직원 관리 섹션에 추가하여 명확한 진입점을 제공한다.

**기술 스택:** Next.js App Router, React 클라이언트 컴포넌트, TypeScript, 기존 `/api/bootstrap` 라우트, Vitest + Testing Library.

---

### 작업 1: 직원 명부 라우트 및 뷰 추가

**수정 대상 파일:**
- 신규 생성: `src/app/manager/employee/employees/page.tsx`
- 수정: `src/app/phase1-app.tsx`
- 테스트: `src/app/phase1-app.test.tsx`

- [ ] **단계 1: 실패하는 테스트 작성**

새로운 명부 라우트를 렌더링하고 다음을 검증하는 테스트를 추가합니다:
- 페이지 제목이 `직원명부관리`인지 확인
- `직원등록` 버튼이 `/manager/employee/employees/new`로 링크되는지 확인
- 직원 목록에 bootstrap 페이로드의 데이터가 표시되는지 확인

```tsx
it("renders the employee roster page", async () => {
  render(<EmployeeRosterPage />);

  expect(await screen.findByRole("heading", { name: "직원명부관리" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "직원등록" })).toHaveAttribute(
    "href",
    "/manager/employee/employees/new",
  );
  expect(await screen.findByText("홍길동 / 010-1234-5678")).toBeInTheDocument();
});
```

- [ ] **단계 2: 테스트 실행 및 실패 여부 확인**

실행 명령어: `npm test -- src/app/phase1-app.test.tsx`
예상 결과: `EmployeeRosterPage`와 새로운 관리자 뷰가 아직 존재하지 않으므로 실패(FAIL).

- [ ] **단계 3: 최소 구현 작성**

`src/app/manager/employee/employees/page.tsx` 파일 생성:

```tsx
import { Phase1App } from "../../../../phase1-app";

export default function EmployeeRosterPage() {
  return <Phase1App mode="manager" managerView="employeeList" />;
}
```

`src/app/phase1-app.tsx` 파일 수정:
- `Phase1AppProps.managerView` 타입에 `"employeeList"` 추가
- 명부 뷰(roster view)의 제목 및 설명 텍스트 추가
- 이름/연락처 필터링을 위한 클라이언트 측 검색 입력(search input) 추가
- `/manager/employee/employees/new`로 연결되는 등록 버튼과 함께 직원 테이블 또는 목록 렌더링
- 기존의 요약(overview), 등록(registration) 및 경비원(guard) 관련 흐름은 변경 없이 유지

- [ ] **단계 4: 테스트 실행 및 성공 여부 확인**

실행 명령어:
`npm test -- src/app/phase1-app.test.tsx`

예상 결과: 테스트 통과(PASS).

- [ ] **단계 5: 커밋**

```bash
git add src/app/manager/employee/employees/page.tsx src/app/phase1-app.tsx src/app/phase1-app.test.tsx plan.md
git commit -m "feat: add employee roster page"
```

---

### 작업 2: 관리자 메뉴에 새 페이지 링크 연결

**수정 대상 파일:**
- 수정: `src/app/phase1-app.tsx`
- 테스트: `src/app/phase1-app.test.tsx`

- [ ] **단계 1: 실패하는 테스트 작성**

관리자 내비게이션의 직원 관리 섹션에 `직원명부관리` 레이블을 가진 `/manager/employee/employees` 링크가 포함되어 있는지 검증하는 단언(assertion)을 추가합니다.

```tsx
expect(screen.getByRole("link", { name: "직원명부관리" })).toHaveAttribute(
  "href",
  "/manager/employee/employees",
);
```

- [ ] **단계 2: 테스트 실행 및 실패 여부 확인**

실행 명령어: `npm test -- src/app/phase1-app.test.tsx`
예상 결과: 메뉴에 명부 라우트가 아직 노출되지 않았으므로 실패(FAIL).

- [ ] **단계 3: 최소 구현 작성**

`src/app/phase1-app.tsx` 내의 직원 관리 메뉴 그룹을 수정하여 명부 항목이 `/manager/employee/employees`를 가리키도록 합니다. 기존의 `직원등록`, `작업장등록`, `작업장배정` 링크는 그대로 유지합니다.

- [ ] **단계 4: 테스트 실행 및 성공 여부 확인**

실행 명령어:
`npm test -- src/app/phase1-app.test.tsx`

예상 결과: 테스트 통과(PASS).

- [ ] **단계 5: 커밋**

```bash
git add src/app/phase1-app.tsx src/app/phase1-app.test.tsx
git commit -m "feat: link employee roster in menu"
```

---

### 작업 3: 라우트 검증 및 `main` 브랜치에 배포

**수정 대상 파일:**
- 수정: 작업 1~2가 성공적으로 완료된 경우 없음

- [ ] **단계 1: 전체 테스트 제품군 실행**

실행 명령어:
`npm test`

예상 결과: 모든 테스트가 통과(PASS).

- [ ] **단계 2: 린트(Lint) 실행**

실행 명령어:
`npm run lint`

예상 결과: ESLint 오류 없음.

- [ ] **단계 3: 브라우저에서 라우트 수동 검증**

`http://localhost:3000/manager/employee/employees`를 열고 다음을 확인합니다:
- 명부 제목이 렌더링되는지 확인
- 검색/필터 컨트롤이 표시되는지 확인
- `직원등록` 링크가 `/manager/employee/employees/new`로 이동하는지 확인

- [ ] **단계 4: GitHub main 브랜치에 푸시**

실행 명령어:
```bash
git push origin main
```

예상 결과: 원격 `main` 브랜치에 명부 페이지 및 메뉴 링크 변경 사항이 반영됨.
