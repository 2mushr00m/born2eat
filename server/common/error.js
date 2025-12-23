// common/error.js

/** @typedef {import('../types/error.js').ErrType} ErrType */
/** @typedef {import('../types/error.js').ErrData} ErrData */

export const ERR = {
  BAD_REQUEST: {
    code: 'BAD_REQUEST',
    status: 400,
    message: '요청이 올바르지 않습니다.',
    expose: true,
    level: 'WARN',
    stack: false,
  },
  VALIDATION: {
    code: 'VALIDATION',
    status: 400,
    message: '요청 값이 올바르지 않습니다.',
    expose: true,
    level: 'WARN',
    stack: false,
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    status: 401,
    message: '인증이 필요합니다.',
    expose: true,
    level: 'WARN',
    stack: false,
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    status: 403,
    message: '권한이 없습니다.',
    expose: true,
    level: 'WARN',
    stack: false,
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    status: 404,
    message: '대상을 찾을 수 없습니다.',
    expose: true,
    level: 'WARN',
    stack: false,
  },
  CONFLICT: {
    code: 'CONFLICT',
    status: 409,
    message: '요청이 충돌했습니다.',
    expose: true,
    level: 'WARN',
    stack: false,
  },
  TOO_MANY_REQUESTS: {
    code: 'TOO_MANY_REQUESTS',
    status: 429,
    message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    expose: true,
    level: 'WARN',
    stack: false,
  },

  INTERNAL: {
    code: 'INTERNAL',
    status: 500,
    message: '알 수 없는 오류가 발생했습니다.',
    expose: false,
    level: 'ERROR',
    stack: true,
  },
  DB: {
    code: 'DB',
    status: 500,
    message: 'DB 처리 중 오류가 발생했습니다.',
    expose: false,
    level: 'ERROR',
    stack: true,
  },
  EXTERNAL_API: {
    code: 'EXTERNAL_API',
    status: 502,
    message: '외부 API 처리 중 오류가 발생했습니다.',
    expose: false,
    level: 'ERROR',
    stack: true,
  },
};

export class AppError extends Error {
  /**
   * @param {ErrType} type                - ERR.*
   * @param {{
   *   message?: string,  // 로그 메시지 커스텀(기본: type.message)
   *   data?: ErrData,    // 로그 데이터(선택)
   *   cause?: Error      // 원인 에러(선택). DB/외부 API 경계에서만 넘기는 걸 권장
   * }} [opt]
   *
   * @example
   * // 1) 기본 메시지
   * throw new AppError(ERR.NOT_FOUND);
   *
   * @example
   * // 2) 로그 메시지 덮어쓰기 + data
   * throw new AppError(ERR.NOT_FOUND, {
   *   message: '레스토랑이 존재하지 않습니다.',
   *   data: { targetId: restaurantId },
   * });
   *
   * @example
   * // 3) cause 연결(권장: DB/외부 API 경계)
   * try {
   *   await repo.insert(row);
   * } catch (err) {
   *   throw new AppError(ERR.DB, {
   *     message: '레스토랑 생성 중 문제가 발생했습니다.',
   *     data: { dbCode: err.code },
   *     cause: err,
   *   });
   * }
   */
  constructor(type, opt = {}) {
    const def = type && typeof type === 'object' && typeof type.code === 'string' ? type : ERR.INTERNAL;
    const msg = typeof opt.message === 'string' && opt.message.trim() !== '' ? opt.message : def.message;
    super(msg, opt.cause ? { cause: opt.cause } : undefined);

    this.name = 'AppError';
    this.code = def.code;
    this.status = def.status;
    this.expose = def.expose;
    this.logLevel = def.level ?? (this.status >= 500 ? 'ERROR' : 'WARN');
    this.logStack = def.stack ?? this.status >= 500;
    this.data = opt.data;

    if (Error.captureStackTrace) Error.captureStackTrace(this, AppError);
  }
}

// 아래는 추후 삭제

export class BasicError extends Error {
  constructor(message, { code, status, location, data } = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code || 'BASIC_ERROR';
    this.status = status || 500;
    this.location = location || undefined;
    this.data = data && typeof data === 'object' ? data : undefined;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class NotFoundError extends BasicError {
  constructor(message, opts = {}) {
    super(message, {
      code: 'NOT_FOUND',
      status: 404,
      ...opts,
    });
  }
}

export class ApiError extends BasicError {
  constructor(message, opts = {}) {
    super(message, {
      code: 'API_ERROR',
      status: 502,
      ...opts,
    });
  }
}
