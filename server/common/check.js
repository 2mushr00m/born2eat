// common/check.js
import { AppError, ERR } from './error.js';
import { eunNeun, iGa } from './josa.js';
import logger from './logger.js';

/** 필수 문자열 검사
 * @param {any} value
 * @param {string} field
 * @returns {string}
 */
export function requireString(value, field) {
  if (value == null)
    throw new AppError(ERR.VALIDATION, {
      message: `${iGa(field)} 누락되었습니다.`,
      data: { keys: [field] },
    });
  if (typeof value !== 'string')
    throw new AppError(ERR.VALIDATION, {
      message: `${field} 형식이 올바르지 않습니다.`,
      data: { keys: [field], extra: { valueType: typeof value } },
    });

  const trimmed = value.trim();
  if (!trimmed)
    throw new AppError(ERR.VALIDATION, {
      message: `${eunNeun(field)} 비울 수 없습니다.`,
      data: { keys: [field] },
    });
  return trimmed;
}

/** 필수 문자열 검사(원문 유지: 비밀번호/토큰 등)
 * @param {any} value
 * @param {string} field
 * @returns {string}
 */
export function requireStringNoTrim(value, field) {
  if (value == null)
    throw new AppError(ERR.VALIDATION, {
      message: `${iGa(field)} 누락되었습니다.`,
      data: { keys: [field] },
    });
  if (typeof value !== 'string')
    throw new AppError(ERR.VALIDATION, {
      message: `${field} 형식이 올바르지 않습니다.`,
      data: { keys: [field], extra: { valueType: typeof value } },
    });

  if (value.length === 0)
    throw new AppError(ERR.VALIDATION, {
      message: `${eunNeun(field)} 비울 수 없습니다.`,
      data: { keys: [field] },
    });

  // 공백만으로 구성된 문자열 거부
  if (!value.replace(/\s/g, '').length)
    throw new AppError(ERR.VALIDATION, {
      message: `${eunNeun(field)} 공백만으로 설정할 수 없습니다.`,
      data: { keys: [field] },
    });

  return value;
}

/** number 파서
 * @param {any} value
 * @param {string} field
 * @param {{
 *   nullable?: boolean,  // true면 빈 값 허용하고 null 반환
 *   positive?: boolean,  // true면 0 이상만 허용
 *   integer?: boolean,   // true면 정수로 반환(소수면 절삭 + warn)
 *   autoFix?: boolean,   // true면 자동 보정
 *   min?: number,        // 최소값(이상)
 *   max?: number,        // 최대값(이하)
 * }} [opts]
 * @returns {number|null}
 */
export function parseNumber(
  value,
  field,
  { nullable = false, positive = false, integer = false, autoFix = false, min, max } = {},
) {
  // 1) 빈 값
  if (value === undefined || value === null || value === '') {
    if (nullable) return null;
    throw new AppError(ERR.VALIDATION, {
      message: `${iGa(field)} 누락되었습니다.`,
      data: { keys: [field] },
    });
  }

  // 2) 숫자 변환
  let n = Number(value);
  if (!Number.isFinite(n)) {
    throw new AppError(ERR.VALIDATION, {
      message: `${field} 형식이 올바르지 않습니다.`,
      data: { keys: [field], extra: { value } },
    });
  }

  // 3) 정수 변환
  if (integer && !Number.isInteger(n)) {
    const converted = Math.trunc(n);
    if (autoFix) {
      logger.warn({
        code: 'COERCE_INT',
        message: `${field} 값이 정수가 아니라서 정수로 보정했습니다.`,
        data: { keys: [field], extra: { value, converted } },
      });
      n = converted;
    } else {
      throw new AppError(ERR.VALIDATION, {
        message: `${eunNeun(field)} 정수여야 합니다.`,
        data: { keys: [field], extra: { value } },
      });
    }
  }

  // 4) 양수 검사
  if (positive && n <= 0) {
    if (autoFix) {
      const converted = 1;
      logger.warn({
        code: 'COERCE_POSITIVE',
        message: `${field} 값이 0 이하라 1로 보정했습니다.`,
        data: { keys: [field], extra: { value: n, converted } },
      });
      n = converted;
    } else {
      throw new AppError(ERR.VALIDATION, {
        message: `${iGa(field)} 지정된 범위 밖입니다.`,
        data: { keys: [field], extra: { value: n } },
      });
    }
  }

  // 5) 범위 검사
  if (min != null && n < min) {
    if (autoFix) {
      const converted = min;
      logger.warn({
        code: 'COERCE_RANGE',
        message: `${field} 값이 최소값보다 작아 ${min}으로 보정했습니다.`,
        data: { keys: [field], extra: { value: n, min, converted } },
      });
      n = converted;
    } else {
      throw new AppError(ERR.VALIDATION, {
        message: `${iGa(field)} 지정된 범위 밖입니다.`,
        data: { keys: [field], extra: { value: n, min } },
      });
    }
  }
  if (max != null && n > max) {
    if (autoFix) {
      const converted = max;
      logger.warn({
        code: 'COERCE_RANGE',
        message: `${field} 값이 최대값보다 커서 ${max}으로 보정했습니다.`,
        data: { keys: [field], extra: { value: n, max, converted } },
      });
      n = converted;
    } else {
      throw new AppError(ERR.VALIDATION, {
        message: `${iGa(field)} 지정된 범위 밖입니다.`,
        data: { keys: [field], extra: { value: n, max } },
      });
    }
  }

  return n;
}

/** id 전용 파서
 * @param {any} raw
 * @returns {number}
 */
export function parseId(raw) {
  return parseNumber(raw, 'id', { integer: true, positive: true });
}

/** boolean 파서
 * @param {any} raw
 * @param {string} field
 * @param {{ nullable?: boolean }} [opt]
 * @returns {boolean|null}
 */
export function parseBoolean(raw, field, opt = {}) {
  const { nullable = false } = opt;

  if (raw == null) {
    if (nullable) return null;
    throw new AppError(ERR.VALIDATION, {
      message: `${field} 값이 비어 있습니다.`,
      data: { keys: [field] },
    });
  }

  if (typeof raw === 'boolean') return raw;

  if (typeof raw === 'number') {
    if (raw === 0) return false;
    if (raw === 1) return true;
    if (nullable) return null;
    throw new AppError(ERR.VALIDATION, {
      message: `${field} 값이 올바르지 않습니다.`,
      data: { keys: [field], extra: { value: raw } },
    });
  }

  const s = String(raw).trim().toLowerCase();
  if (s === '') {
    if (nullable) return null;
    throw new AppError(ERR.VALIDATION, {
      message: `${iGa(field)} 누락되었습니다.`,
      data: { keys: [field] },
    });
  }

  if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(s)) return false;

  throw new AppError(ERR.VALIDATION, {
    message: `${field} 형식이 올바르지 않습니다.`,
    data: { keys: [field], extra: { value: raw } },
  });
}
