// common/logger.js

/** @typedef {import('../types/logger.js').InfoPayload} InfoPayload */
/** @typedef {import('../types/logger.js').DebugPayload} DebugPayload */
/** @typedef {import('../types/logger.js').ErrorPayload} ErrorPayload */

const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[38;5;222m',

    text: '\x1b[38;5;252m',
    debug: '\x1b[38;5;246m',
    stack: '\x1b[90m',
    data: '\x1b[38;5;4m', 
    debugData: '\x1b[38;5;67m', 
};
const INDENT = '  ';
const STACK_MAX_LINES = 5;
const DATA_INLINE_MAX = 140;
const ENABLE_DEBUG = process.env.LOG_DEBUG === '1';


function safeStringify(value, space = 2) {
    try {
        const seen = new WeakSet();
        return JSON.stringify(
        value,
        (k, v) => {
            if (typeof v === 'object' && v !== null) {
                if (seen.has(v)) return '[Circular]';
                seen.add(v);
            }
            return v;
        },
        space
        );
    } catch {
        return '"[Unserializable]"';
    }
}
function limitLines(text, maxLines = STACK_MAX_LINES) {
    if (!text) return '';
    const lines = String(text).split('\n');
    return lines.slice(0, maxLines).join('\n');
}
function indentLines(text, prefix = INDENT) {
    return String(text)
        .split('\n')
        .map((ln) => `${prefix}${ln}`)
        .join('\n');
}

function formatDataBlock(data) {
    const one = safeStringify(data, 0);
    if (one.length <= DATA_INLINE_MAX) return `${INDENT}data: ${one}`;
    const pretty = safeStringify(data, 2);
    return `${INDENT}data:\n${indentLines(pretty, INDENT)}`;
}
function formatHeader(message, method, path) {
    if (!method && !path) return `${COLORS.text}${message}${COLORS.reset}`;

    const m = method ? `${COLORS.yellow}${method}${COLORS.reset}` : '';
    const p = path ? `${COLORS.stack}${path}${COLORS.reset}` : '';
    const mp = method && path ? `${m} ${p}` : `${m}${p}`;

    return `${COLORS.text}${message}${COLORS.reset} ${COLORS.text}(${mp}${COLORS.text})${COLORS.reset}`;
}
function colorByLevel(level) {
    if (level === 'ERROR') return COLORS.red;
    if (level === 'WARN') return COLORS.yellow;
    if (level === 'INFO') return COLORS.green;
    if (level === 'DEBUG') return COLORS.stack;
    return COLORS.text;
}

function stackEnabled(errLike) {
    if (!errLike) return true;
    if (typeof errLike === 'object' && errLike?.logStack === false) return false;
    return true;
}
function pickStackFull(err) {
    if (!err) return '';
    if (err?.logStack === false) return '';
    if (typeof err.stack !== 'string') return '';
    const s = err.stack.trim();
    return s || '';
}
function pickCauseStackOrHead(err) {
    const c = err?.cause;
    if (!c) return '';

    if (c instanceof Error) {
        if (typeof c.stack === 'string' && c.stack.trim()) return c.stack.trim();
        return `${c.name}: ${c.message}`;
    }

    return `cause: ${safeStringify(c, 2)}`;
}

function normalize(payload) {
    const p = payload instanceof Error ? { err: payload } : (payload ?? {});
    
    const cause = pickCauseStackOrHead(p);
    const code = p?.code ?? p?.err?.code ?? 'LOG';
    const message = p?.message ?? p?.err?.message ?? 'Unknown error';
    const err = p?.err;

    const method = p?.method ?? p?.data?.method ?? err?.method;
    const path = p?.path ?? p?.data?.path ?? err?.path;
    
    let data = p?.data ?? err?.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        const keys = Object.keys(data);
        const onlyMethodPath =
            keys.length > 0 &&
            keys.every((k) => k === 'method' || k === 'path');

        if (onlyMethodPath) {
            data = null;
        } else {
            const { method: _m, path: _p, ...rest } = data;
            data = Object.keys(rest).length ? rest : null;
        }
    }

    return { code, message, err, data, method, path, cause };
}
function formatLog({ level, code, message, err, data, method, path, payloadCause }) {
    const codeColor = colorByLevel(level);
    const lines = [];

    // 1) header: [CODE] message (METHOD PATH)
    const headerMsg = formatHeader(message, method, path);
    lines.push(`${codeColor}[${code}]${COLORS.reset} ${headerMsg}`);

    // 2) stack: at ... (N줄 제한)
    const causeStack = payloadCause ? pickCauseStackOrHead(payloadCause) : '';
    if (payloadCause && stackEnabled(err)) {
        lines.push(`${COLORS.stack}${limitLines(causeStack)}${COLORS.reset}`);
    } else {
        const causeStack = pickCauseStackOrHead(err);
        if (causeStack) lines.push(`${COLORS.stack}${limitLines(causeStack)}${COLORS.reset}`);
        else {
            const stack = pickStackFull(err);
            if (stack) lines.push(`${COLORS.stack}${limitLines(stack)}${COLORS.reset}`);
        }
    }

    // 3) data: 한 줄에 JSON
    if (data !== undefined && data !== null) {
        lines.push(`${COLORS.data}${formatDataBlock(data)}${COLORS.reset}`);
    }

    return lines.join('\n');
}
function formatInfo({ code, message }) {
    const c = code ?? 'INFO';
    const msg = message ?? '';
    return `${COLORS.green}[${c}]${COLORS.reset} ${COLORS.text}${msg}${COLORS.reset}`;
}
function formatDebug({ code, message, data }) {
    const c = code ?? 'DEBUG';
    const msg = message ?? '';

    const lines = [];
    lines.push(`${COLORS.debug}[${c}] ${msg}${COLORS.reset}`);

    if (data !== undefined && data !== null)
        lines.push(`${COLORS.debugData}${formatDataBlock(data)}${COLORS.reset}`);

    return lines.join('\n');
}

export default {
    /** INFO 로그
     * 
     * @example
     * logger.info({
     *   code: 'SERVER_START',
     *   message: `Server started ${PORT}`,
     * });
     * 
     * @param {InfoPayload} payload
     */
    info(payload) {
        const p = payload ?? {};
        console.log(formatInfo({
            code: p.code,
            message: p.message,
        }));
    },

    /** WARN 로그
     *
     * @example
     * logger.warn(err);
     * 
     * @example
     * logger.warn({
     *   code: 'SLOW_QUERY',
     *   message: '쿼리 수행이 느립니다.',
     *   data: { sqlName: 'restaurant.list', ms: 1200 },
     * });
     * 
     * @param {Error | ErrorPayload} payload
     */
    warn(payload) {
        const n = normalize(payload);
        console.warn(formatLog({ level: 'WARN', ...n }));
    },

    /** ERROR 로그
     *
     * @example
     *   logger.error(err);
     *
     * @example
     * logger.error({
     *   code: 'DB',
     *   message: '회원 정보 수정 중 오류가 발생했습니다.',
     *   data: { targetId: userId, keys: ['nickname'], dbCode: 'ER_DUP_ENTRY' },
     * });
     * 
     * @example
     * // 드문 예외
     * logger.error({
     *   code: 'EXTERNAL_API',
     *   message: '외부 API 실패했습니다 무시하고 진행합니다.',
     *   data: { extra: { api: 'kakao_local', action: 'continue' } },
     *   cause: err,
     * });
     * 
     * @param {Error | ErrorPayload} payload
     */
    error(payload) {
        const n = normalize(payload);
        console.error(formatLog({ level: 'ERROR', ...n }));
    },

    /** DEBUG 로그
     *
     * @example
     * logger.debug({ message: '쿼리 파라미터', data: { keys: ['a','b'] } });
     * 
     * @param {DebugPayload} payload
     */
    debug(payload) {
        if (!ENABLE_DEBUG) return;
        const p = payload ?? {};
        console.log(formatDebug({
            code: p.code,
            message: p.message,
            data: p.data,
        }));
    },
    
};