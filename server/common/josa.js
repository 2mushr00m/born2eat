// common/josa.js

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const JONGSUNG_COUNT = 28;

/** 종성(받침) 여부 판단
 * @param {string} s
 * @returns {boolean} true면 받침 있음
 */
function hasFinalConsonant(s) {
  const t = String(s ?? '').trim();
  if (!t) return false;

  const ch = t[t.length - 1];
  const code = ch.codePointAt(0);

  // 한글 음절(가~힣)만 정확 판별
  if (code >= HANGUL_BASE && code <= HANGUL_LAST) {
    const index = code - HANGUL_BASE;
    const jong = index % JONGSUNG_COUNT;
    return jong !== 0;
  }

  return false;
}

/** '은/는' 붙이기
 * @param {string} word
 * @returns {string}
 */
export function eunNeun(word) {
  const w = String(word ?? '').trim();
  const josa = hasFinalConsonant(w) ? '은' : '는';
  return `${w}${josa}`;
}

/** '이/가' 붙이기
 * @param {string} word
 * @returns {string}
 */
export function iGa(word) {
  const w = String(word ?? '').trim();
  const josa = hasFinalConsonant(w) ? '이' : '가';
  return `${w}${josa}`;
}

/** '을/를' 붙이기
 * @param {string} word
 * @returns {string}
 */
export function eulReul(word) {
  const w = String(word ?? '').trim();
  const josa = hasFinalConsonant(w) ? '을' : '를';
  return `${w}${josa}`;
}
