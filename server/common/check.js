// server/common/check.js

import { BasicError } from './error.js';

/**
 * @typedef {Object} CheckOptions
 * @property {string} [location] - 에러 발생 위치 (예: 'fileName.functionName')
 * @property {Object} [data]     - 추가 컨텍스트 (요청 body, query, params 등)
 */

/**
 * 필수 문자열 검사
 *
 * @param {any} value
 * @param {string} fieldName
 * @param {CheckOptions} [opts]
 * @returns {string}
 * @throws {BasicError}
 */
export function requireString(value, fieldName, { location, data } = {}) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new BasicError(`${fieldName} 값이 String 형식이 아니거나 비어 있습니다.`, {
            code: 'INVALID_STRING',
            status: 400,
            location,
            data,
        });
    }
    return value.trim();
}

/**
 * 숫자 변환 & 검사
 *
 * @param {any} value
 * @param {string} fieldName
 * @param {Object} [opts]
 * @param {boolean} [opts.nullable=false]     // true면 빈 값 허용하고 null 반환
 * @param {boolean} [opts.positive=false]     // true면 양수만 허용
 * @param {boolean} [opts.integer=false]      // true면 정수로 반환
 * @param {number}  [opts.min]               // 최소값(이상)
 * @param {number}  [opts.max]               // 최대값(이하)
 * @param {string}  [opts.location]
 * @param {Object}  [opts.data]
 * @param {string}  [opts.code]              // 기본: MISSING_NUMBER/INVALID_NUMBER/OUT_OF_RANGE 등
 * @param {number}  [opts.status]            // 기본: 400
 * @returns {number|null}
 * @throws {BasicError}
 */
export function parseNumber(
    value, fieldName, {
        nullable = false, positive = false, integer = false, min, max,
        location, data, code, status, } = {},
) {
    if (value === undefined || value === null || value === '') {
        if (nullable) return null;

        throw new BasicError(`${fieldName} 값이 비어 있습니다.`, {
            code: code || 'MISSING_NUMBER',
            status: status || 400,
            location,
            data,
        });
    }

    const n = Number(value);

    if (!Number.isFinite(n)) {
        throw new BasicError(`${fieldName} 값이 Number 형식이 아닙니다.`, {
            code: code || 'INVALID_NUMBER',
            status: status || 400,
            location,
            data: { ...data, raw: value },
        });
    }
    
    if (integer && !Number.isInteger(n)) {
        const converted = Math.trunc(n);
        logger.warn({
            code: 'PARSE_TO_INTEGER',
            message: `${fieldName} 값이 정수가 아니라서 정수로 변환했습니다.`,
            location,
            data: { ...data, raw: n, converted },
        });
        n = converted;
    }
    
    if (positive && n < 0) {
        throw new BasicError(`${fieldName} 값은 0 이상이어야 합니다.`, {
            code: code || 'POSITIVE_NUMBER_REQUIRED',
            status: status || 400,
            location,
            data: { ...data, value: n },
        });
    }

    if (min != null && n < min) {
        throw new BasicError(`${fieldName} 값은 ${min} 이상이어야 합니다.`, {
            code: code || 'OUT_OF_RANGE',
            status: status || 400,
            location,
            data: { ...data, value: n, min },
        });
    }

    if (max != null && n > max) {
        throw new BasicError(`${fieldName} 값은 ${max} 이하여야 합니다.`, {
            code: code || 'OUT_OF_RANGE',
            status: status || 400,
            location,
            data: { ...data, value: n, max },
        });
    }

    return n;
}
