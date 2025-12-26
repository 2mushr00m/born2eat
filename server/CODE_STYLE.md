<h1 style="font-family: serif;" align="center">Back‑End : Code Style 🍽️
</h1>

<br/>

📌 이 문서는 Born2Eat 백엔드의 **코딩 스타일과 규칙**을 정리합니다.

폴더/레이어 책임, 네이밍, 요청·응답 DTO 규칙, 에러(AppError/ERR)와 로깅(logger) 규격을 포함합니다.

하며, 예외 처리는 `AppError/ERR`와 `logger` 규격으로 통일합니다.

<br/>

## 1) 폴더 구조 및 레이어 규칙

프로젝트는 아래 구조를 기준으로 레이어 책임을 분리합니다.

```text
server/
 ├─ common/        # 공통 유틸
 ├─ middleware/    # 인증·업로드·차단
 ├─ routes/        # URL 기준 라우터
 ├─ controllers/   # 요청 흐름 제어
 │   └─ requests/  # req 분해·검증
 ├─ services/      # 비즈니스 로직
 ├─ repository/    # DB 연결
 ├─ types/         # 타입(d.ts)
 ├─ docs/          # 문서 모음
 │   └─ openapi/   # Swagger
 └─ index.js       # 실행 파일
```

### 1-1) routes (URL 기준)

- URL prefix 기준으로 라우터 파일을 분리합니다.

- 기본 미들웨어(`sessionUser`, `requireAuth`, `requireAdmin`)는 `index.js`에서 prefix 단위로 적용하므로, 라우터에서는 **예외 케이스만 추가**합니다.

- `uploaders.*`는 라우터에서 필요한 엔드포인트에 직접 연결합니다.

<br/>

### 1-2) controllers (요청 흐름 제어)

- 컨트롤러는 “요청을 받아 서비스로 넘기고 응답하는” 역할만 합니다.

- 기능 단위로 구성하며, URL이 `/me/...`여도 실제 도메인이 inquiry면 `inquiryController`에 있을 수 있습니다.
  - 예: `GET /me/inquiries`는 `meController`가 아니라 `inquiryController`에 위치할 수 있습니다.

<br/>

### 1-3) controllers/requests (req 분해·검증 전담)

- 서비스 구현 부담을 줄이기 위해, `req`에서 필요한 값을 꺼내고 형식 검사를 끝낸 후 “정리된 입력”만 서비스로 전달합니다.

- 여기서 수행하는 일:
  - `req.params/query/body` 분해
  - 숫자/문자/열거형/nullable 파싱
  - 필수값 검증
  - 페이지네이션 기본값 주입 등

<br/>

### 1-4) services (비즈니스 로직 + DB 연결)

- 서비스는 DB와 연결하여 실제 처리를 수행합니다.

- 필요 시 `conn`을 받는 내부 함수로 중복 코드를 재활용합니다.
  - 예: `selectUserBasic(conn, userId)`

- 트랜잭션이 필요하면 서비스에서 `conn.beginTransaction()`을 사용합니다.

<br/>

### 1-5) 네이밍 규칙

- API 요청/응답 DTO: `camelCase`
- DB 컬럼: `snake_case` 유지
- SQL placeholder: `camelCase`
- type: `PascalCase`
- 응답 ID 키: 리소스별로 통일(`restaurantId`, `userId` 등)

<br/>

---

## 2) 에러 규칙 (AppError / ERR)

### 2-1) 에러 처리 원칙

- 컨트롤러/서비스 경계에서는 `AppError(ERR.*)`만 throw합니다.

- 의도된 실패(검증/권한/대상 없음)와 시스템 오류(DB/외부 API/예상치 못한 예외)를 `ERR.*`로 구분합니다.

- `cause`는 DB/외부 API 경계에서만 연결하는 것을 권장합니다.

<br/>

### 2-2) AppError 예시

```js
// 1) 기본 메시지
throw new AppError(ERR.NOT_FOUND);

// 2) 메시지 + data
throw new AppError(ERR.NOT_FOUND, {
  message: '음식점이 존재하지 않습니다.',
  data: { targetId: restaurantId },
});

// 3) DB 경계에서 cause 연결(권장)
try {
  await repo.insert(row);
} catch (err) {
  throw new AppError(ERR.DB, {
    message: '음식점 생성 중 문제가 발생했습니다.',
    data: { dbCode: err.code },
    cause: err,
  });
}
```

<br/>

### 2-3) ErrData 스키마

`data`에는 문제 추적에 필요한 최소 정보만 넣습니다.

- `targetId`: 대상 식별자(예: userId, restaurantId)
- `keys`: 변경/검증 대상 필드 목록
- `dbCode`: MySQL 에러 코드(예: `ER_DUP_ENTRY`)
- `apiUrl`, `apiStatus`, `apiCode`: 외부 API 호출 정보
- 나머지는 `extra`에 넣습니다.

<br/>

---

## 3) logger 규칙

### 3-1) 공통 원칙

- `message`는 사람이 읽는 한 문장으로 작성합니다.
- `code`는 검색 가능한 짧은 키워드로 통일합니다.
- `data`는 최소 정보만 넣고, 나머지는 `extra`에 넣습니다.
- `cause`는 외부 API/라이브러리 에러를 감싸서 로깅할 때만 사용합니다.

<br/>

### 3-2) 레벨별 사용 기준

#### logger.info(payload)

정상 실행 중 의미 있는 상태 변화를 기록합니다.

```js
logger.info({
  code: 'SERVER_START',
  message: `Server started ${PORT}`,
});
```

<br/>

#### logger.debug(payload)

개발/운영 디버깅용 상세 로그를 기록합니다.

```js
logger.debug({
  code: 'QUERY_PARAMS',
  message: '쿼리 파라미터 확인',
  data: { keys: ['page', 'limit'], extra: { page: 1, limit: 20 } },
});
```

<br/>

#### logger.warn(payload)

실패는 아니지만 관찰이 필요한 상태를 기록합니다.

```js
logger.warn({
  code: 'SLOW_QUERY',
  message: '쿼리 수행이 느립니다.',
  data: { extra: { sqlName: 'restaurant.list', ms: 1200 } },
});
```

<br/>

#### logger.error(payload)

요청 실패/처리 중단 수준의 오류를 기록합니다.

```js
logger.error({
  code: 'DB',
  message: '회원 정보 수정 중 오류가 발생했습니다.',
  data: { targetId: userId, keys: ['nickname'], dbCode: err?.code },
});
```

```js
logger.error({
  code: 'EXTERNAL_API',
  message: '외부 API 호출에 실패했습니다.',
  data: {
    apiUrl: err?.config?.url,
    apiCode: err?.code,
    apiStatus: err?.response?.status,
    extra: { action: 'abort' },
  },
  cause: err,
});
```

<br/>
