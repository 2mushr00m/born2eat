
// =========== Request ===========

/** 목록 조회용 필터
 * @typedef {Object} RestaurantListFilter
 * @property {string|null} food
 * @property {string[]} tags
 * @property {string|null} region
 * @property {string|null} q
 * @property {number} page
 * @property {number} limit
 */

/** 생성용 payload
 * @typedef {Object} RestaurantCreatePayload
 * @property {string}      name
 * @property {string|null} [kakao_place_id]
 * @property {string|null} [region_code]
 * @property {string|null} [food_tag_code]
 * @property {string|null} [main_food]
 * @property {string|null} [phone]
 * @property {string|null} [address]
 * @property {number|null} [longitude]
 * @property {number|null} [latitude]
 * @property {boolean}     [is_published]
 * @property {'RAW'|'BASIC'|'VERIFIED'} [data_status]
 */

/** 수정용 payload
 * @typedef {Object} RestaurantUpdatePayload
 * @property {string|null} [name]
 * @property {string|null} [kakao_place_id]
 * @property {string|null} [region_code]
 * @property {string|null} [food_tag_code]
 * @property {string|null} [main_food]
 * @property {string|null} [phone]
 * @property {string|null} [address]
 * @property {number|null} [longitude]
 * @property {number|null} [latitude]
 * @property {boolean|null} [is_published]
 * @property {'RAW'|'BASIC'|'VERIFIED'} [data_status]
 */



// =========== Response ===========

/** 사진 정보
 * @typedef {Object} Photo
 * @property {string} file_path                     - 이미지 파일 경로 또는 URL
 * @property {string|null} caption                  - 사진 설명
 * @property {string} created_at                    - 업로드 시각
 * @property {'USER'|'ADMIN'|'CRAWLER'} source_type - 사진 출처
 * @property {string|null} source_user_nickname     - 출처가 USER일 때 닉네임
 */

/** 사진 그룹
 * @typedef {Object} PhotosGroup
 * @property {Photo[]} main        - 대표 사진
 * @property {Photo[]} menu_board  - 메뉴판 사진
 * @property {Photo[]} etc         - 기타 사진
 */

/** 지역 정보 (depth1~2)
 * @typedef {Object} Region
 * @property {string|null} code    - 법정동 코드(10자리) (예: 1100100110)
 * @property {string|null} depth1  - 시/도 (예: '서울특별시')
 * @property {string|null} depth2  - 시/군/구 (예: '강남구')
 */

/** OTT 링크 모음
 * @typedef {Object} BroadcastOtt
 * @property {string|null} [NETFLIX]  - 넷플릭스 링크
 * @property {string|null} [TVING]    - 티빙 링크
 * @property {string|null} [WAVVE]    - 웨이브 링크
 * @property {string|null} [etc]      - 기타 플랫폼 링크
 */

/** 방송 출연 정보
 * @typedef {Object} Broadcast
 * @property {string|null} name            - 방송 프로그램명
 * @property {number|null} episode_no      - 출연 회차 번호
 * @property {string|null} aired_at        - 방송일
 * @property {BroadcastOtt} ott            - OTT 플랫폼별 링크
 * @property {string[]} youtube            - 공식 유튜브 영상 URL 목록
 */

/** GET /restaurants item
 * @typedef {Object} Restaurant
 * @property {number} restaurant_id
 * @property {string} name
 * @property {string|null} kakao_place_id     - 카카오맵 place_id
 * 
 * @property {string|null} food_category      - 음식 분류 카테고리
 * @property {string|null} main_food          - 대표 메뉴/카테고리 이름
 * @property {string|null} main_photo         - 대표 사진 url
 * @property {string|null} address            - 전체 주소 문자열
 * 
 * @property {number|null} longitude          - 경도 (x)
 * @property {number|null} latitude           - 위도 (y)
 *
 * @property {number} rating_sum              - 평점 합계
 * @property {number} review_count            - 리뷰 개수
 * @property {number} like_count              - 좋아요 수
 *
 * @property {string[]} tags      - 태그 목록 (분위기/상황/추가 food 태그 등)
 * @property {Region} region
 */

/** GET /restaurants
 * @typedef {Object} RestaurantList
 * @property {Restaurant[]} items
 * @property {number} page
 * @property {number} limit
 * @property {number} total
 */

/** GET /restaurants/:id
 * @typedef {Object} RestaurantDetail
 * @property {number} restaurant_id           - 레스토랑 PK
 * @property {string} name                    - 가게 이름
 * @property {string|null} kakao_place_id     - 카카오맵 place_id
 *
 * @property {string|null} food_category      - 음식 분류 카테고리
 * @property {string|null} main_food          - 대표 메뉴/카테고리 이름
 * @property {string|null} phone              - 전화번호
 * @property {string|null} address            - 전체 주소 문자열
 *
 * @property {number|null} longitude          - 경도 (x)
 * @property {number|null} latitude           - 위도 (y)
 *
 * @property {number} rating_sum              - 평점 합계
 * @property {number} review_count            - 리뷰 개수
 * @property {number} like_count              - 좋아요 수
 *
 * @property {Broadcast[]} broadcasts         - 방송/OTT/유튜브 정보
 * @property {PhotosGroup} photos             - 사진 그룹
 * @property {Region} region                  - 지역 depth1~2 이름
 * 
 * @property {string[]} tags                  - 태그 목록 (분위기/상황/추가 food 태그 등)
 */

export {};