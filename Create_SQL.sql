DROP DATABASE born2eat;
CREATE DATABASE born2eat;
USE born2eat;

-- 1. region 테이블
CREATE TABLE region (
    region_code   CHAR(10)          NOT NULL COMMENT '법정동 코드 PK (SSDDDGGGRR)',
    depth         TINYINT UNSIGNED  NOT NULL COMMENT '1=시도, 2=시군구, 3=읍면동',
    name          VARCHAR(100)      NOT NULL COMMENT '지역명',
    parent_code   CHAR(10)          NULL COMMENT '상위 region_code FK',

    PRIMARY KEY (region_code),
    CONSTRAINT fk_region_parent
        FOREIGN KEY (parent_code) REFERENCES region(region_code)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. tag 테이블
CREATE TABLE tag (
    tag_id        INT UNSIGNED      NOT NULL AUTO_INCREMENT COMMENT '태그 PK',
    type          ENUM('food', 'tag') NOT NULL COMMENT 'food / tag',
    code          VARCHAR(50)       NOT NULL COMMENT '식별 코드',	-- (ex. korean)
    name          VARCHAR(100)      NOT NULL COMMENT '표시용 이름',

    parent_id     INT UNSIGNED      NULL COMMENT '상위 태그 FK',
    path          VARCHAR(255)      NOT NULL COMMENT '계층 경로', -- (ex. food/한식/국밥)
    usage_count   INT UNSIGNED      NOT NULL DEFAULT 0 COMMENT '사용 횟수',
    click_count   INT UNSIGNED      NOT NULL DEFAULT 0 COMMENT '검색/클릭 횟수',

    PRIMARY KEY (tag_id),
    UNIQUE KEY uq_tag_type_code (type, code),     -- 같은 타입 내에서 code는 UNIQUE
    KEY idx_tag_path (path),
    KEY idx_tag_parent (parent_id),
    CONSTRAINT fk_tag_parent
        FOREIGN KEY (parent_id) REFERENCES tag(tag_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. restaurant 테이블
CREATE TABLE restaurant (
    restaurant_id      INT UNSIGNED      NOT NULL AUTO_INCREMENT COMMENT '음식점 PK',
    kakao_place_id     VARCHAR(50)       NULL COMMENT '카카오맵 place_id',
    name               VARCHAR(200)      NOT NULL COMMENT '가게 이름',

    created_at         DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시각',
    is_published       TINYINT UNSIGNED  NOT NULL DEFAULT 0 COMMENT '사용자 노출 여부',
    data_status        ENUM('RAW','BASIC','VERIFIED') NOT NULL DEFAULT 'RAW' COMMENT '데이터 품질 단계',

    main_food          CHAR(50)          NULL COMMENT '대표 음식',
    region_code        CHAR(10)          NULL COMMENT 'region FK', -- (법정동 코드)
    food_tag_id        INT UNSIGNED      NULL COMMENT '음식 분류 태그 FK',
    review_count       INT UNSIGNED      NOT NULL DEFAULT 0 COMMENT '리뷰 개수',
    rating_sum         DECIMAL(6,1)      NOT NULL DEFAULT 0.0 COMMENT '별점 합계',

    longitude          DECIMAL(10,7)     NULL COMMENT '경도 (x)',
    latitude           DECIMAL(10,7)     NULL COMMENT '위도 (y)',
    phone              VARCHAR(50)       NULL COMMENT '연락처',
    address            VARCHAR(255)      NULL COMMENT '주소',

    PRIMARY KEY (restaurant_id),
    UNIQUE KEY uq_restaurant_kakao_place_id (kakao_place_id),
    KEY idx_restaurant_region (region_code),
    KEY idx_restaurant_main_food_tag (food_tag_id),
    CONSTRAINT fk_restaurant_region
        FOREIGN KEY (region_code) REFERENCES region(region_code)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_restaurant_food_tag
        FOREIGN KEY (food_tag_id) REFERENCES tag(tag_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3-1. restaurant 테이블 INSERT 시 usage_count 증가
CREATE TRIGGER trg_restaurant_ai_foodtag
AFTER INSERT ON restaurant
FOR EACH ROW
UPDATE tag
   SET usage_count = usage_count + 1
 WHERE tag_id = NEW.food_tag_id;

-- 3-2. restaurant 테이블 food_tag_id UPDATE 시 usage_count 관리
CREATE TRIGGER trg_restaurant_au_foodtag
AFTER UPDATE ON restaurant
FOR EACH ROW
UPDATE tag
   SET usage_count =
       CASE
           -- 1) 기존 태그: 값이 있었고, 변경/제거되면 -1 (0 아래로는 떨어지지 않게)
           WHEN tag_id = OLD.food_tag_id
                AND (NEW.food_tag_id IS NULL OR NEW.food_tag_id <> OLD.food_tag_id)
             THEN GREATEST(usage_count - 1, 0)

           -- 2) 새 태그: 값이 새로 생기거나, 기존과 달라졌으면 +1
           WHEN tag_id = NEW.food_tag_id
                AND (OLD.food_tag_id IS NULL OR NEW.food_tag_id <> OLD.food_tag_id)
             THEN usage_count + 1

           -- 3) 그 외는 변화 없음
           ELSE usage_count
       END
 WHERE tag_id IN (OLD.food_tag_id, NEW.food_tag_id);

-- 3-3. restaurant 테이블 DELETE 시 usage_count 관리
CREATE TRIGGER trg_restaurant_ad_foodtag
AFTER DELETE ON restaurant
FOR EACH ROW
UPDATE tag
   SET usage_count = GREATEST(usage_count - 1, 0)
 WHERE tag_id = OLD.food_tag_id;

-- 4. restaurant_tag 테이블 (restaurant - tag N:M)
CREATE TABLE restaurant_tag (
    restaurant_id  INT UNSIGNED NOT NULL COMMENT 'restaurant FK',
    tag_id         INT UNSIGNED NOT NULL COMMENT 'tag FK',

    PRIMARY KEY (restaurant_id, tag_id),
    KEY idx_restaurant_tag_tag (tag_id),

    CONSTRAINT fk_restaurant_tag_restaurant
        FOREIGN KEY (restaurant_id) REFERENCES restaurant(restaurant_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_restaurant_tag_tag
        FOREIGN KEY (tag_id) REFERENCES tag(tag_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4-1. restaurant_tag INSERT 시 usage_count 증가
CREATE TRIGGER trg_restaurant_tag_ai
AFTER INSERT ON restaurant_tag
FOR EACH ROW
  UPDATE tag
     SET usage_count = usage_count + 1
   WHERE tag_id = NEW.tag_id;

-- 4-2. restaurant_tag DELETE 시 usage_count 감소
CREATE TRIGGER trg_restaurant_tag_ad
AFTER DELETE ON restaurant_tag
FOR EACH ROW
  UPDATE tag
     SET usage_count = GREATEST(usage_count - 1, 0)
   WHERE tag_id = OLD.tag_id;

-- 5. user 테이블
CREATE TABLE user (
    user_id        BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '사용자 PK',
    email          VARCHAR(255)     NOT NULL COMMENT '이메일',
    password_hash  VARCHAR(255)     NOT NULL COMMENT '비밀번호 해시',
    nickname       VARCHAR(50)      NOT NULL UNIQUE COMMENT '표시 이름',
    phone          VARCHAR(20)      NULL COMMENT '전화번호',
    profile_url    VARCHAR(255)     NULL COMMENT '프로필 이미지 URL',
    role           ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER' COMMENT '권한 등급',
    status         ENUM('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED') NOT NULL DEFAULT 'ACTIVE' COMMENT '계정 상태',
    created_at     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '가입 시각',
    deleted_at     DATETIME         NULL COMMENT '탈퇴 시각',
    suspended_until DATETIME        NULL COMMENT '정지 만료 시각',

    PRIMARY KEY (user_id),
    UNIQUE KEY uq_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5-1. auth_account 테이블 (SNS 계정 연결)
CREATE TABLE auth_account (
    auth_id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'SNS 계정 연결 PK',
    user_id           BIGINT UNSIGNED NOT NULL COMMENT 'user FK',
    provider          VARCHAR(50)     NOT NULL COMMENT 'SNS 공급자', -- (kakao, naver, google 등)
    provider_user_id  VARCHAR(255)    NOT NULL COMMENT '공급자 유저 ID',

    PRIMARY KEY (auth_id),
    UNIQUE KEY uq_auth_provider_user (provider, provider_user_id),
    KEY idx_auth_user (user_id),

    CONSTRAINT fk_auth_user
        FOREIGN KEY (user_id) REFERENCES user(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5-2. restaurant_like 테이블
CREATE TABLE restaurant_like (
    user_id       BIGINT UNSIGNED NOT NULL COMMENT '유저 FK',
    restaurant_id INT UNSIGNED    NOT NULL COMMENT '음식점 FK',
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '좋아요 누른 시각',

    PRIMARY KEY (user_id, restaurant_id),

    CONSTRAINT fk_restaurant_like_user
        FOREIGN KEY (user_id) REFERENCES user(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_restaurant_like_restaurant
        FOREIGN KEY (restaurant_id) REFERENCES restaurant(restaurant_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5-3. restaurant_photo 테이블
CREATE TABLE restaurant_photo (
    photo_id         INT UNSIGNED      NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '사진 PK',
    restaurant_id    INT UNSIGNED      NOT NULL COMMENT '음식점 FK',

    photo_type       ENUM('MAIN', 'MENU_BOARD', 'ETC')
                     NOT NULL DEFAULT 'ETC' COMMENT '사진 종류',
    sort_order       TINYINT UNSIGNED  NULL COMMENT '노출 우선순위', -- 작을수록 먼저, NULL이면 자동정렬
    file_path        VARCHAR(255)      NOT NULL COMMENT '이미지 경로 또는 URL',
    caption          VARCHAR(255)      NULL COMMENT '캡션(설명)',

    source_type      ENUM('USER', 'ADMIN', 'CRAWLER')
                     NOT NULL DEFAULT 'USER' COMMENT '사진 제공 주체 유형',
    source_user_id   BIGINT UNSIGNED   NULL COMMENT '제보자 유저 ID',

    created_at       DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '업로드 시각',

    KEY ix_restaurant_photo_list (restaurant_id, photo_type, sort_order, created_at),
    CONSTRAINT fk_restaurant_photo_restaurant
        FOREIGN KEY (restaurant_id) REFERENCES restaurant(restaurant_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_restaurant_photo_user
        FOREIGN KEY (source_user_id) REFERENCES user(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. review 테이블
CREATE TABLE review (
    review_id      BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '리뷰 PK',
    restaurant_id  INT UNSIGNED     NOT NULL COMMENT '가게 FK',
    user_id        BIGINT UNSIGNED  NOT NULL COMMENT '작성자 FK',
    
    rating         DECIMAL(2,1)     NOT NULL COMMENT '별점', -- (0.0 ~ 5.0)
    content        TEXT             NOT NULL COMMENT '본문',
    created_at     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '작성 시각',
    updated_at     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 시각',
    is_visible     TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '노출 여부',

    PRIMARY KEY (review_id),
    KEY idx_review_restaurant (restaurant_id),
    KEY idx_review_user (user_id),

    CONSTRAINT fk_review_restaurant
        FOREIGN KEY (restaurant_id) REFERENCES restaurant(restaurant_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_review_user
        FOREIGN KEY (user_id) REFERENCES user(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6-1. review_like 테이블
CREATE TABLE review_like (
    user_id    BIGINT UNSIGNED NOT NULL COMMENT '유저 FK',
    review_id  BIGINT UNSIGNED NOT NULL COMMENT '리뷰 FK',
    created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '좋아요 누른 시각',

    PRIMARY KEY (user_id, review_id),

    CONSTRAINT fk_review_like_user
        FOREIGN KEY (user_id) REFERENCES user(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_review_like_review
        FOREIGN KEY (review_id) REFERENCES review(review_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='유용한 리뷰';

-- 6-2. review_tag 테이블
CREATE TABLE review_tag (
    review_id   BIGINT UNSIGNED NOT NULL COMMENT '리뷰 FK',
    tag_id      INT UNSIGNED    NOT NULL COMMENT '태그 FK',

    PRIMARY KEY (review_id, tag_id),
    KEY idx_review_tag_tag (tag_id),

    CONSTRAINT fk_review_tag_review
        FOREIGN KEY (review_id) REFERENCES review(review_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_review_tag_tag
        FOREIGN KEY (tag_id) REFERENCES tag(tag_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6-3. review_photo 테이블
CREATE TABLE review_photo (
    photo_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '리뷰 사진 PK',
    review_id        BIGINT UNSIGNED NOT NULL COMMENT '리뷰 FK',
    file_path        VARCHAR(255)    NOT NULL COMMENT '이미지 경로 또는 URL',
    caption          VARCHAR(255)    NULL COMMENT '캡션(설명)',

    PRIMARY KEY (photo_id),
    KEY idx_review_photo_review (review_id),

    CONSTRAINT fk_review_image_review
        FOREIGN KEY (review_id) REFERENCES review(review_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. broadcast 테이블
CREATE TABLE broadcast (
    broadcast_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '방송 PK',
    broadcast_code VARCHAR(50) NOT NULL UNIQUE COMMENT '크롤러 코드', --  (예: TASTY_GUYS)
    name           VARCHAR(100) NOT NULL COMMENT '프로그램명',
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7-1. broadcast_episode 테이블
CREATE TABLE broadcast_episode (
    broadcast_id INT UNSIGNED NOT NULL COMMENT '방송 FK',
    episode_no   INT UNSIGNED NOT NULL COMMENT '회차 번호',
    aired_at     DATE         NULL COMMENT '방영일', -- (알 수 없으면 NULL)

    PRIMARY KEY (broadcast_id, episode_no),
    CONSTRAINT fk_episode_broadcast
        FOREIGN KEY (broadcast_id) REFERENCES broadcast(broadcast_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7-2. broadcast_ott 테이블
CREATE TABLE broadcast_ott (
    broadcast_id   INT UNSIGNED NOT NULL COMMENT '방송 FK',
    platform       ENUM('NETFLIX', 'TVING', 'WAVVE', 'ETC')
                   NOT NULL DEFAULT 'ETC' COMMENT 'OTT 플랫폼',
    ott_url        VARCHAR(500) NOT NULL COMMENT 'URL',

    PRIMARY KEY (broadcast_id, platform),
    CONSTRAINT fk_broadcast_ott_broadcast
        FOREIGN KEY (broadcast_id) REFERENCES broadcast(broadcast_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7-3. broadcast_youtube 테이블
CREATE TABLE broadcast_youtube (
    broadcast_id   INT UNSIGNED NOT NULL COMMENT '방송 FK',
    episode_no     INT UNSIGNED NOT NULL COMMENT '회차 번호',
    youtube_url    VARCHAR(500) NOT NULL COMMENT 'URL',

    UNIQUE KEY uq_broadcast_youtube_episode (broadcast_id, episode_no, youtube_url),
    CONSTRAINT fk_broadcast_youtube_episode
        FOREIGN KEY (broadcast_id, episode_no)
        REFERENCES broadcast_episode(broadcast_id, episode_no)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7-4. broadcast_restaurant 테이블
CREATE TABLE broadcast_restaurant (
    restaurant_id INT UNSIGNED NOT NULL COMMENT '음식점 FK',
    broadcast_id  INT UNSIGNED NOT NULL COMMENT '방송 FK',
    episode_no    INT UNSIGNED NOT NULL COMMENT '방영 회차',

    PRIMARY KEY (restaurant_id, broadcast_id, episode_no),
    CONSTRAINT fk_br_restaurant
        FOREIGN KEY (restaurant_id) REFERENCES restaurant(restaurant_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_br_episode
        FOREIGN KEY (broadcast_id, episode_no)
        REFERENCES broadcast_episode(broadcast_id, episode_no)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. inquiry 테이블
CREATE TABLE inquiry (
    inquiry_id   INT UNSIGNED      NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '문의 PK',
    user_id      BIGINT UNSIGNED   NULL COMMENT '문의한 사용자 FK', -- (비회원 문의면 NULL)
    
    type         ENUM('GENERAL', 'BUG', 'RESTAURANT', 'ACCOUNT', 'OTHER')
                 NOT NULL DEFAULT 'GENERAL' COMMENT '문의 유형',
    title        VARCHAR(200)      NOT NULL COMMENT '문의 제목',
    content      TEXT              NOT NULL COMMENT '문의 내용',
    
    status       ENUM('PENDING', 'ANSWERED')
                 NOT NULL DEFAULT 'PENDING' COMMENT '처리 상태',
    created_at   DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '문의 생성 시각',
    answer       TEXT              NULL COMMENT '답변 내용',
    answered_by_user_id BIGINT UNSIGNED NULL COMMENT '답변한 관리자 FK',
    answered_at  DATETIME          NULL COMMENT '답변한 시각',
    
    CONSTRAINT fk_inquiry_user
        FOREIGN KEY (user_id) REFERENCES user(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_inquiry_answer_user
        FOREIGN KEY (answered_by_user_id) REFERENCES user(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='사용자 문의';

-- 8-1. inquiry_image 테이블
CREATE TABLE inquiry_image (
    inquiry_id  INT UNSIGNED   NOT NULL COMMENT '문의 FK',
    file_path   VARCHAR(255)   NOT NULL COMMENT '파일 경로 또는 URL',

    KEY idx_inquiry_image_inquiry_id (inquiry_id),

    CONSTRAINT fk_inquiry_image_inquiry
        FOREIGN KEY (inquiry_id) REFERENCES inquiry(inquiry_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- ======================================

-- 1. 일반 태그(type = 'tag')
INSERT INTO tag (type, code, name, parent_id, path) VALUES
('tag', 'honbap',           '혼밥',             NULL, 'tag/혼밥'),
('tag', 'date',             '데이트',           NULL, 'tag/데이트'),
('tag', 'family-gathering', '가족모임',         NULL, 'tag/가족모임'),
('tag', 'friends-meeting',  '친구모임',         NULL, 'tag/친구모임'),

('tag', 'pretty-interior',  '예쁜 인테리어',   NULL, 'tag/예쁜 인테리어'),
('tag', 'quiet',            '조용한',           NULL, 'tag/조용한'),
('tag', 'value-for-money',  '가성비',           NULL, 'tag/가성비'),
('tag', 'all-you-can-eat',  '무한리필',         NULL, 'tag/무한리필'),

('tag', 'depress',          '우울할 때',        NULL, 'tag/우울할 때'),
('tag', 'celebration',      '축하할 때',        NULL, 'tag/축하할 때'),
('tag', 'special-day',      '특별한 날',        NULL, 'tag/특별한 날'),

('tag', 'parking',          '주차시설',         NULL, 'tag/주차시설'),
('tag', 'no-kids-zone',     '노키즈존',         NULL, 'tag/노키즈존'),
('tag', 'pet-friendly',     '반려견 출입 가능', NULL, 'tag/반려견 출입 가능'),
('tag', 'clean-restroom',   '화장실 깨끗함',   NULL, 'tag/화장실 깨끗함');

-- 2. 음식 대분류 (최상위, parent_id = NULL)
INSERT INTO tag (type, code, name, parent_id, path) VALUES
('food', 'korean',        '한식',            NULL, 'food/한식'),
('food', 'chinese',       '중식',            NULL, 'food/중식'),
('food', 'japanese',      '일식',            NULL, 'food/일식'),
('food', 'western',       '양식',            NULL, 'food/양식'),
('food', 'asian-etc',     '아시안·기타',     NULL, 'food/아시안·기타'),
('food', 'fast-junkfood', '패스트·정크푸드', NULL, 'food/패스트·정크푸드'),
('food', 'cafe-dessert',  '카페·디저트',     NULL, 'food/카페·디저트'),
('food', 'pub-bar',       '술집·주점',       NULL, 'food/술집·주점');

-- 2. 부모 tag_id를 변수에 담기
--    (상위 food 대분류 태그들은 미리 INSERT 되어 있다고 가정)
SET @korean_id        := (SELECT tag_id FROM tag WHERE type = 'food' AND code = 'korean');
SET @chinese_id       := (SELECT tag_id FROM tag WHERE type = 'food' AND code = 'chinese');
SET @japanese_id      := (SELECT tag_id FROM tag WHERE type = 'food' AND code = 'japanese');
SET @western_id       := (SELECT tag_id FROM tag WHERE type = 'food' AND code = 'western');
SET @asian_etc_id     := (SELECT tag_id FROM tag WHERE type = 'food' AND code = 'asian-etc');
SET @fast_junkfood_id := (SELECT tag_id FROM tag WHERE type = 'food' AND code = 'fast-junkfood');
SET @cafe_dessert_id  := (SELECT tag_id FROM tag WHERE type = 'food' AND code = 'cafe-dessert');
SET @pub_bar_id       := (SELECT tag_id FROM tag WHERE type = 'food' AND code = 'pub-bar');

-- 3. 음식 중분류 (한식 하위)
INSERT INTO tag (type, code, name, parent_id, path) VALUES
('food', 'gukbap',          '국밥',        @korean_id, 'food/한식/국밥'),
('food', 'korean-soup',     '국·탕·찌개',  @korean_id, 'food/한식/국·탕·찌개'),
('food', 'korean-bbq',      '고기·구이',   @korean_id, 'food/한식/고기·구이'),
('food', 'korean-set-meal', '백반/한정식', @korean_id, 'food/한식/백반/한정식'),
('food', 'jjim-jeongol',    '찜·전골',     @korean_id, 'food/한식/찜·전골'),
('food', 'haejang-guk',     '해장/해장국', @korean_id, 'food/한식/해장/해장국');

-- 4. 음식 중분류 (중식 하위)
INSERT INTO tag (type, code, name, parent_id, path) VALUES
('food', 'jjajang-jjambbong', '짜장/짬뽕',   @chinese_id, 'food/중식/짜장/짬뽕'),
('food', 'chinese-dish',      '중식요리',    @chinese_id, 'food/중식/중식요리'),
('food', 'mala',              '마라탕/훠궈', @chinese_id, 'food/중식/마라탕/훠궈');

-- 5. 음식 중분류 (일식 하위)
INSERT INTO tag (type, code, name, parent_id, path) VALUES
('food', 'sushi',            '초밥',       @japanese_id, 'food/일식/초밥'),
('food', 'sashimi',          '회/해산물',  @japanese_id, 'food/일식/회/해산물'),
('food', 'ramen',            '라멘',       @japanese_id, 'food/일식/라멘'),
('food', 'donkatsu-donburi', '돈카츠/덮밥', @japanese_id, 'food/일식/돈카츠/덮밥'),
('food', 'udon-soba',        '우동/소바',  @japanese_id, 'food/일식/우동/소바');

-- 6. 음식 중분류 (양식 하위)
INSERT INTO tag (type, code, name, parent_id, path) VALUES
('food', 'pasta', '파스타',   @western_id, 'food/양식/파스타'),
('food', 'steak', '스테이크', @western_id, 'food/양식/스테이크');

-- 7. 음식 중분류 (아시안·기타 하위)
INSERT INTO tag (type, code, name, parent_id, path) VALUES
('food', 'thai-vietnam',       '태국/베트남',     @asian_etc_id, 'food/아시안·기타/태국/베트남'),
('food', 'indian-nepal',       '인도/네팔',       @asian_etc_id, 'food/아시안·기타/인도/네팔'),
('food', 'middleeast-turkish', '중동/터키',       @asian_etc_id, 'food/아시안·기타/중동/터키'),
('food', 'mexican',            '멕시칸',          @asian_etc_id, 'food/아시안·기타/멕시칸'),
('food', 'world-food',         '기타 세계요리',   @asian_etc_id, 'food/아시안·기타/기타 세계요리');

-- 8. 음식 중분류 (패스트·정크푸드 하위)
INSERT INTO tag (type, code, name, parent_id, path) VALUES
('food', 'burger-sandwich', '버거/샌드위치', @fast_junkfood_id, 'food/패스트·정크푸드/버거/샌드위치'),
('food', 'fried-chicken',   '치킨',         @fast_junkfood_id, 'food/패스트·정크푸드/치킨'),
('food', 'pizza',           '피자',         @fast_junkfood_id, 'food/패스트·정크푸드/피자');

-- 9. 음식 중분류 (카페·디저트 하위)
INSERT INTO tag (type, code, name, parent_id, path) VALUES
('food', 'cafe',     '카페',       @cafe_dessert_id, 'food/카페·디저트/카페'),
('food', 'bakery',   '베이커리',   @cafe_dessert_id, 'food/카페·디저트/베이커리'),
('food', 'icecream', '아이스크림', @cafe_dessert_id, 'food/카페·디저트/아이스크림');

-- 10. 음식 중분류 (술집·주점 하위)
INSERT INTO tag (type, code, name, parent_id, path) VALUES
('food', 'pocha-pub',          '포차/호프',       @pub_bar_id, 'food/술집·주점/포차/호프'),
('food', 'izakaya',            '이자카야',        @pub_bar_id, 'food/술집·주점/이자카야'),
('food', 'wine-cocktail-bar',  '와인바/칵테일바', @pub_bar_id, 'food/술집·주점/와인바/칵테일바'),
('food', 'traditional-liquor', '전통주/막걸리',   @pub_bar_id, 'food/술집·주점/전통주/막걸리');

-- 11. 방송 프로그램 샘플
INSERT INTO broadcast (broadcast_code, name)
VALUES ('TASTY_GUYS', '맛있는 녀석들');
