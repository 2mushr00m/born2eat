<br/>

<p align="center">
  <img src="../logo.png" alt="Born2Eat"/>
</p>
<h1 style="font-family: serif;" align="center">Back‑End Guide 🍽️</h1>
<br/>

> 📌 이 문서는 **Born2Eat 백엔드 구조 · 운영 가이드**입니다.<br/>
> 백엔드 폴더의 모든 작업물은 `2mushr00m`이 작성하였습니다.

<br/>

## 🛠️ 기술 스택

- <img src="https://img.shields.io/badge/Node.js-v22.21.0-339933?logo=node.js&logoColor=white&style=for-the-badge" />
- <img src="https://img.shields.io/badge/npm.js-10.9.4-CB3837?logo=npm&logoColor=white&style=for-the-badge" />
- <img src="https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white&style=for-the-badge" />
- <img src="https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white&style=for-the-badge" />

<br/>

## 🗂️ 프로젝트 구조

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

<br/>

## 📦 API 목록

[`APIs.md`](./APIs.md) 문서에서는 미들웨어 적용 범위와 각 API의 `METHOD · PATH · 기능 요약`을 정리합니다.

Swagger UI는 서버 실행 후 `/swagger`로 접속하면 전체 API 상세 문서를 확인할 수 있습니다.

<br/>

## 🧩 코딩 스타일

[`CODE_STYLE.md`](./CODE_STYLE.md) 문서에서는 네이밍 규칙, 레이어별 책임 범위, `AppError/ERR` 사용 규칙, `logger payload` 규격 등.

프로젝트 전반의 코딩 스타일을 정리합니다.

<br/>

## 🤖 ChatGPT 세팅

[`CHATGPT_PROMPT.md`](./CHATGPT_PROMPT.md) 문서에서는 프로젝트 규칙과 코드 스타일, 응답 형식과 함께 ChatGPT 개발 보조 프롬프트를 제공합니다.
