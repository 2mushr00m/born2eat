/**
 * @typedef {'SUCCESS'|'SKIP'} CrawlStatus
 */

/**
 * @typedef {Object} CrawlParams
 * @property {string} broadcast_code  - 방송 크롤러 코드 (예: 'TASTY_GUYS')
 * @property {number} episode_from    - 시작 회차 (포함)
 * @property {number|null} episode_to - 종료 회차 (포함, null이면 최신 회차까지)
 * @property {number} [delayMs]       - 회차 사이 대기 ms (기본 1500ms)
 */

/**
 * 크롤링 결과
 *
 * @typedef {Object} CrawlResult
 * @property {string} broadcast_code
 * @property {number} broadcast_id
 * @property {number} from
 * @property {number} to
 * @property {number[]} successEpisodes
 * @property {number[]} skippedEpisodes
 * @property {number[]} failedEpisodes
 */

/**
 * @typedef {Object} ScrapRestaurant
 * @property {string|null} name
 * @property {string|null} address
 * @property {string|null} kakaoMapId
 * @property {string[]}    menus
 */

/**
 * 단일 회차 파싱 결과
 *
 * @typedef {Object} ScrapResult
 * @property {number}          episode_no
 * @property {CrawlStatus}     status
 * @property {number}          parser_ver
 * @property {string|null}     message
 * @property {string}          crawl_url
 * @property {string|null}     aired_at
 * @property {ScrapRestaurant[]} restaurants
 */

/**
 * 스크래퍼 인터페이스
 *
 * @typedef {Object} Scraper
 * @property {() => Promise<number>} latestEpisode
 * @property {(episode_no:number) => Promise<ScrapResult>} parseEpisode
 */

export {};
