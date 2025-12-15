// server/common/logger.js

/**
 * @typedef {Object} LogPayload
 * @property {string} code       - 로그 코드
 * @property {string} message    - 사람이 읽을 수 있는 로그 메시지
 * @property {string} [location] - 위치 표시
 * @property {Object} [data]     - 추가 디버깅 정보
 */

const COLORS = {
    reset: '\x1b[0m',

    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[38;5;222m',

    text: '\x1b[38;5;252m',
    location: '\x1b[90m',
    data: '\x1b[38;5;4m', 
};

function formatLog({ level, code, message, location, data }) {
    const INDENT1 = '    ';     // 4 spaces
    const INDENT2 = '        '; // 8 spaces

    let codeColor = COLORS.green;
    if (level === 'ERROR') codeColor = COLORS.red;
    if (level === 'WARN')  codeColor = COLORS.yellow;

    const codePart = `${codeColor}[${code}]${COLORS.reset}`;
    const msgPart  = `${COLORS.text} ${message}${COLORS.reset}`;

    const lines = [];
    lines.push(`${codePart}${msgPart}`);

    if (location)
        lines.push(`${INDENT1}${COLORS.location}(at ${location})${COLORS.reset}`);

    if (data) {
        const { location: _omit, ...rest } = data;
        const keys = Object.keys(rest);

        if (keys.length > 0) {
            lines.push(
                `${INDENT1}${COLORS.data}data={${COLORS.reset}`
            );

            for (const key of keys) {
                const value = rest[key];
                const jsonValue = JSON.stringify(value);
                lines.push(
                    `${INDENT2}${COLORS.data}"${key}": ${jsonValue},${COLORS.reset}`
                );
            }
            lines.push(`${INDENT1}${COLORS.data}}${COLORS.reset}`);
        }
    }

    return lines.join('\n');
}

export default {
    /**
     * @example
     * logger.error({
     *   code: 'SERVICE_ERROR',
     *   message: '서비스 기능 중 에러 발생',
     *   location: 'function_name',
     *   data: { prarams: [] },
     * });
     * @param {LogPayload} payload
     */
    error(payload) { console.error(formatLog({ level: 'ERROR', ...payload })); },

    /**
     * @example
     * logger.warn({
     *   code: 'SLOW_RESPONSE',
     *   message: '처리에 지연 발생',
     *   location: 'function_name',
     *   data: { prarams: [] },
     * });
     * @param {LogPayload} payload
     */
    warn(payload)  { console.warn(formatLog({ level: 'WARN',  ...payload })); },

    /**
     * @example
     * logger.log({
     *   code: 'SERVER_START',
     *   message: 'Server started on port 8080',
     *   location: 'function_name',
     *   data: { prarams: [] },
     * });
     * @param {LogPayload} payload
     */
    log(payload)   { console.log(formatLog({ level: 'LOG',   ...payload })); },
};
