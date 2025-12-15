// server/common/error.js

/**
 * @typedef {Object} ErrorOptions
 * @property {string} [code]      - 에러 코드 (예: 'VALIDATION_ERROR')
 * @property {number} [status]    - HTTP 상태 코드 (예: 400, 404, 500)
 * @property {string} [location]  - 발생 위치 (예: 'fileName.functionName')
 * @property {Object} [data]      - 추가 디버깅 정보
 */


/**
 * 기본 애플리케이션 에러(공통 베이스)
 *
 * - 잘못된 입력값
 * - DB 트랜잭션 실패
 * - 논리 버그
 * - 파라미터 누락 / Null 체크 실패
 *
 * @example
 * throw new BasicError('입력값이 올바르지 않습니다.', {
 *   code: 'VALIDATION_ERROR',
 *   status: 400,
 *   location: 'restaurantService.create',
 *   data: { body: req.body },
 * });
 *
 * @param {string} message
 * @param {ErrorOptions} [opts]
 */
export class BasicError extends Error {
    constructor(message, { code, status, location, data } = {}) {
        super(message);
        this.name = new.target.name;
        this.code = code || 'BASIC_ERROR';
        this.status = status || 500;
        this.location = location || undefined;
        this.data = (data && typeof data === 'object') ? data : undefined;
        Error.captureStackTrace?.(this, new.target);
    }
}


/**
 * 조회 결과가 존재하지 않을 때 사용하는 에러
 *
 * - DB에서 row를 찾지 못했을 때
 * - /restaurants/123 요청은 정상인데 123번 식당이 DB에 없을 때
 *
 * @example
 * const row = await getRestaurant(id);
 * if (!row) {
 *   throw new NotFoundError('식당을 찾을 수 없습니다.', {
 *     location: 'restaurantService.getById',
 *     data: { restaurantId: id },
 *   });
 * }
 *
 * @param {string} message
 * @param {ErrorOptions} [opts]
 */
export class NotFoundError extends BasicError {
    constructor(message, opts = {}) {
        super(message, {
            code: 'NOT_FOUND',
            status: 404,
            ...opts,
        });
    }
}


/**
 * 외부 API 호출 중 발생한 에러
 *
 * - axios 요청 실패 (timeout, 5xx, 4xx 등)
 * - HTML 구조 변경으로 파싱 실패
 * - 외부 사이트 차단/리다이렉트/로봇체크/네트워크 오류
 *
 * @example
 * try {
 *   const res = await axios.get(url);
 *   // ...
 * } catch (e) {
 *   throw new ApiError('외부 지도 API 호출에 실패했습니다.', {
 *     location: 'mapService.searchPlace',
 *     data: { url, originalError: e.message },
 *   });
 * }
 *
 * @param {string} message
 * @param {ErrorOptions} [opts]
 */
export class ApiError extends BasicError {
    constructor(message, opts = {}) {
        super(message, {
            code: 'API_ERROR',
            status: 502,
            ...opts,
        });
    }
}