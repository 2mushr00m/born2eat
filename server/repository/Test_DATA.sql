-- TASTY_GUYS 500~null 크롤링 이후에 사용

-- 서울(동작구, 중구, 용산구, 영등포구, 강서구, 성동구, 송파구, 강남구)
UPDATE restaurant
   SET region_code = '1100000000'
 WHERE restaurant_id IN (1,2,3,8,10,11,12,13,14,15);

-- 경기(파주시, 안산시 단원구, 고양시 일산동구)
UPDATE restaurant
   SET region_code = '4100000000'
 WHERE restaurant_id IN (5,6,7,9,19,20);

-- 경북(구미시)
UPDATE restaurant
   SET region_code = '4700000000'
 WHERE restaurant_id IN (16,17,18);

-- 주소 없는 4번은 NULL
UPDATE restaurant
   SET region_code = NULL
 WHERE restaurant_id = 4;

-- 두부고을, 은호식당 일산점, 신사랑방식당, 하인선생 → 한식/백반·한정식
UPDATE restaurant
   SET food_tag_id = (
       SELECT tag_id FROM tag
        WHERE type = 'food' AND code = 'korean-set-meal'
   )
 WHERE restaurant_id IN (1,9,17,20);

-- 인천집 → 한식/해장·해장국
UPDATE restaurant
   SET food_tag_id = (
       SELECT tag_id FROM tag
        WHERE type = 'food' AND code = 'haejang-guk'
   )
 WHERE restaurant_id = 2;

-- 스미스앤월렌스키, 르쁠라 → 양식/스테이크
UPDATE restaurant
   SET food_tag_id = (
       SELECT tag_id FROM tag
        WHERE type = 'food' AND code = 'steak'
   )
 WHERE restaurant_id IN (3,19);

-- 207FEET → 술집/와인바·칵테일바
UPDATE restaurant
   SET food_tag_id = (
       SELECT tag_id FROM tag
        WHERE type = 'food' AND code = 'wine-cocktail-bar'
   )
 WHERE restaurant_id = 4;

-- 은하장 → 중식/중식요리
UPDATE restaurant
   SET food_tag_id = (
       SELECT tag_id FROM tag
        WHERE type = 'food' AND code = 'chinese-dish'
   )
 WHERE restaurant_id = 5;

-- 김종우 갈백집, 대박물갈비, 봉자막창, 김태주선산곱창 구미본점 → 한식/고기·구이
UPDATE restaurant
   SET food_tag_id = (
       SELECT tag_id FROM tag
        WHERE type = 'food' AND code = 'korean-bbq'
   )
 WHERE restaurant_id IN (6,10,13,16);

-- 김가네낙지전문점, 어부의딸 본점, 여의도다미 → 일식/회·해산물
UPDATE restaurant
   SET food_tag_id = (
       SELECT tag_id FROM tag
        WHERE type = 'food' AND code = 'sashimi'
   )
 WHERE restaurant_id IN (7,11,14);

-- 원조호수삼계탕, 왕십리닭내장탕집 → 한식/국·탕·찌개
UPDATE restaurant
   SET food_tag_id = (
       SELECT tag_id FROM tag
        WHERE type = 'food' AND code = 'korean-soup'
   )
 WHERE restaurant_id IN (8,12);

-- 빨대포차 → 술집/포차·호프
UPDATE restaurant
   SET food_tag_id = (
       SELECT tag_id FROM tag
        WHERE type = 'food' AND code = 'pocha-pub'
   )
 WHERE restaurant_id = 15;

-- 카페둑 → 카페·디저트/카페
UPDATE restaurant
   SET food_tag_id = (
       SELECT tag_id FROM tag
        WHERE type = 'food' AND code = 'cafe'
   )
 WHERE restaurant_id = 18;

-- 태그 id 미리 조회
SET @tag_honbap := (SELECT tag_id FROM tag WHERE type = 'tag' AND code = 'honbap');
SET @tag_value_for_money := (SELECT tag_id FROM tag WHERE type = 'tag' AND code = 'value-for-money');
SET @tag_date := (SELECT tag_id FROM tag WHERE type = 'tag' AND code = 'date');
SET @tag_special_day := (SELECT tag_id FROM tag WHERE type = 'tag' AND code = 'special-day');
SET @tag_pretty_interior := (SELECT tag_id FROM tag WHERE type = 'tag' AND code = 'pretty-interior');
SET @tag_friends_meeting := (SELECT tag_id FROM tag WHERE type = 'tag' AND code = 'friends-meeting');
SET @tag_pocha_pub := (SELECT tag_id FROM tag WHERE type = 'food' AND code = 'pocha-pub');
SET @tag_cafe := (SELECT tag_id FROM tag WHERE type = 'food' AND code = 'cafe');

-- 두부고을: 혼밥, 가성비
INSERT INTO restaurant_tag (restaurant_id, tag_id)
VALUES (1, @tag_honbap), (1, @tag_value_for_money);

-- 스미스앤월렌스키: 데이트, 특별한 날
INSERT INTO restaurant_tag (restaurant_id, tag_id)
VALUES (3, @tag_date), (3, @tag_special_day);

-- 카페둑: 예쁜 인테리어, 카페
INSERT INTO restaurant_tag (restaurant_id, tag_id)
VALUES (18, @tag_pretty_interior), (18, @tag_cafe);

-- 빨대포차: 포차/호프, 친구모임
INSERT INTO restaurant_tag (restaurant_id, tag_id)
VALUES (15, @tag_pocha_pub), (15, @tag_friends_meeting);

