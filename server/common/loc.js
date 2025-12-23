// server/common/loc.js
import path from 'node:path';

/**
 * 주어진 import.meta.url을 기준으로
 * "파일명.함수명" 또는 "파일명.문자열" 꼴 location 문자열을 만들어주는 팩토리
 *
 * @param {string} fileUrl  - 보통 모듈에서 import.meta.url 전달
 * @returns {(target: Function|string) => string}
 */
export function makeLoc(fileUrl) {
  const filenameWithExt = path.basename(new URL(fileUrl).pathname);
  const moduleName = filenameWithExt.replace(/\.[^.]+$/, '');

  /**
   * @param {Function|string} target
   * @returns {string}
   */
  return function loc(target) {
    // 1) 함수가 넘어온 경우: moduleName.fnName
    if (typeof target === 'function') {
      const fnName = target.name || 'anonymous';
      return `${moduleName}.${fnName}`;
    }

    // 2) 문자열이 넘어온 경우
    if (typeof target === 'string') {
      // 이미 'Foo.bar' 형태면 그대로 사용
      if (target.includes('.')) {
        return target;
      }
      // 그렇지 않으면 'moduleName.target'
      return `${moduleName}.${target}`;
    }

    // 3) 그 외 예외적인 경우
    return `${moduleName}.unknown`;
  };
}
