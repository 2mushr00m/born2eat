<h1 style="font-family: serif;" align="center">Back‑End : Middleware & APIs 🍽️
</h1>

<br/>

📌 이 문서는 Born2Eat 백엔드의 **미들웨어 적용 범위**와 각 API의 `METHOD · PATH · 기능 요약`을 정리합니다.

각 항목의 상세한 요청·응답 스펙과 예시는 Swagger에서 확인할 수 있으며, 서버 실행 후 `/swagger`로 접속합니다.

<br/>

> **요청 조건(Auth), 파라미터(Query/Path/Body), 응답 형식, 에러 케이스** 등 상세한 설명은 Swagger를 참고하세요.<br/><br/>
> _※ 프로젝트의 Swagger 경로/operationId에 따라 링크는 필요 시 조정하세요._

<br/>

## 📑 공통 규칙

대부분의 API는 JSON 요청이며 `Content-Type: application/json`으로 전송합니다.

파일 업로드가 필요한 API는 `multipart/form-data`를 사용하며, 필드명과 타입은 Swagger에 정의된 스키마를 따릅니다.

날짜·시간 값은 ISO 8601 형식으로 전송하며, 날짜만 필요한 값은 `YYYY-MM-DD` 형식으로 전송합니다.

> `/broadcasts` 관련 API의 `airedAt` 필드만 `YYYY-MM-DD` 형식입니다.

<br/>

## 🧩 미들웨어

### Auth / Guard

- `sessionUser` : 세션 사용자를 조회하여 `req.user`에 주입합니다.
- `requireAuth` : 로그인 상태가 아니면 요청을 차단합니다.
- `requireAdmin` : 관리자 권한이 아니면 요청을 차단합니다.
- `blockSuspendedUser` : 정지 사용자 요청을 차단합니다.

> ⚠️ 인증/가드 미들웨어는 **index.js에서 prefix 단위로 적용**하며, 라우터 내부에서는 예외 케이스만 추가합니다.

<br/>

### Uploaders (multer)

- `uploaders.profile` : 사용자 프로필 이미지 (1개)
- `uploaders.review` : 사용자 리뷰 사진 (최대 5개)
- `uploaders.inquiry` : 문의 이미지 (최대 3개)
- `uploaders.restaurant` : 음식점 사진 (제한 없음)

> ⚠️ 한 파일당 최대 10MB 제한됩니다.<br/>
> 업로드 과정에서 발생한 에러는 `uploadAppError()`를 통해 `AppError`로 변환하여 공통 에러 응답으로 처리합니다.

<br/>

## 🧭 라우터 목록

```text
/restaurants   (sessionUser)
/reviews       (sessionUser + requireAuth)
/inquiries     (sessionUser)
/users         (no middleware)
/auth          (no middleware)
/me            (sessionUser + requireAuth)
/admin         (sessionUser + requireAuth + requireAdmin)
```

<br/>

## 📦 엔드포인트 목록

<details>
  <summary><b>/restaurants</b></summary>

- `GET /restaurants`: 음식점 목록
- `GET /restaurants/:restaurantId`: 음식점 상세보기
- `GET /restaurants/:restaurantId/reviews`: 해당 음식점의 리뷰 보기
- `POST /restaurants/:restaurantId/reviews`: 해당 음식점에 리뷰 작성 (로그인 필요 + 비정지 회원)

</details>

<details>
  <summary><b>/reviews</b> : 로그인 필요</summary>

- `PATCH /reviews/:reviewsId`: 리뷰 수정 (비정지 회원)
- `DELETE /reviews/:reviewsId`: 리뷰 삭제

</details>

<details>
  <summary><b>/users</b></summary>

- (작성 예정) 사용자 관련 API

</details>

<details>
  <summary><b>/auth</b></summary>

- `POST /auth/signup`: 회원가입
- `POST /auth/login`: 로그인
- `POST /auth/logout`: 로그아웃

</details>

<details>
  <summary><b>/me</b> : 로그인 필요</summary>

- `GET /me`: 내 정보
- `PATCH /me`: 내 정보 수정
- `DELETE /me`: 회원탈퇴
- `PATCH /me/password`: 비밀번호 수정
- `GET /me/inquiries`: 내 문의 목록
- `GET /me/inquiries/:inquiryId`: 내 문의 상세보기
- `GET /me/reviews`: 내 리뷰 목록

</details>

<details>
  <summary><b>/inquiries</b></summary>

- `POST /inquiries`: 문의하기

</details>

<details>
  <summary><b>/admin</b> : 관리자 전용</summary>

###

- `GET /admin/inquiries`: 문의 목록
- `GET /admin/inquiries/:inquiryId`: 문의 상세보기
- `PATCH /admin/inquiries/:inquiryId`: 문의 답변

###

- `GET /admin/restaurants`: 음식점 목록
- `GET /admin/restaurants/:restaurantId`: 음식점 상세보기
- `POST /admin/restaurants`: 음식점 생성
- `PATCH /admin/restaurants/:restaurantId`: 음식점 수정
- `DELETE /admin/restaurants/:restaurantId`: 음식점 삭제

###

- `GET /admin/reviews`: 리뷰 목록
- `DELETE /admin/reviews`: 리뷰 숨기기

</details>

<br/>

## ✅ 성공 응답

성공 응답은 아래 형태 중 하나로 반환합니다.

```json
{ "success": true }
```

```json
{ "success": true, "result": {} }
```

<br/>

## ⚠️ 에러 처리

에러 응답은 아래 형태로 반환합니다.

```json
{
  "success": false,
  "code": "UNAUTHORIZED",
  "message": "로그인이 필요합니다."
}
```

사용자에게 전달하기 민감한 에러 응답은 일반화된 메시지를 사용합니다.

```json
{
  "success": false,
  "code": "INTERNAL",
  "message": "알 수 없는 오류가 발생했습니다."
}
```

<br/>
