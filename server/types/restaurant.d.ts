// types/restaurant.d.ts
import type { RestaurantDataStatus, RestaurantPhotoSource, RestaurantPhotoType } from './enum';

declare global {

    namespace restaurant {

        // ======= Controller → Service ==========
        type ListFilter = { // 목록 조회 filter
            food?: string;
            tags?: string[];
            region?: string;
            q?: string;
            page: number;
            limit: number;
        };

        type CreatePayload = { // 생성 payload
            name: string;
            kakaoPlaceId?: string;
            regionCode?: string;
            foodTagCode?: string;
            mainFood?: string;
            phone?: string;
            address?: string;
            longitude?: number;
            latitude?: number;
            isPublished?: boolean;
            dataStatus?: RestaurantDataStatus;
        };

        type UpdatePayload = { // 수정 payload
            name?: string;
            kakaoPlaceId?: string | null;
            regionCode?: string | null;
            foodTagCode?: string | null;
            mainFood?: string | null;
            phone?: string | null;
            address?: string | null;
            longitude?: number | null;
            latitude?: number | null;
            isPublished?: boolean;
            dataStatus?: RestaurantDataStatus;
        };

        // ========== Service → Controller =======
        type Photo = { // 사진 정보
            filePath: string;           // 이미지 파일 경로 또는 URL
            caption: string | null;     // 사진 설명
            createdAt: Date;            // 업로드 시각
            sourceType: RestaurantPhotoSource; // 사진 출처
            sourceUserNickname: string | null; // 출처가 USER일 때 닉네임
        };

        type PhotosGroup = { // 사진 그룹
            main: Photo[];      // 대표 사진
            menuBoard: Photo[]; // 메뉴판 사진
            etc: Photo[];       // 기타 사진
        };

        type Region = { // 지역
            code: string | null;    // 법정동 코드(10자리) (예: 1100100110)
            depth1: string | null;  // 시/도 (예: '서울특별시')
            depth2: string | null;  // 시/군/구 (예: '강남구')
        };

        type BroadcastOtt = { // 방송 OTT 링크
            NETFLIX?: string | null;    // 넷플릭스 링크
            TVING?: string | null;      // 티빙 링크
            WAVVE?: string | null;      // 웨이브 링크
            etc?: string | null;        // 기타 플랫폼 링크
        };

        type Broadcast = { // 방송 정보
            name: string | null;        // 방송 프로그램명
            episodeNo: number | null;   // 출연 회차 번호
            airedAt: Date | null;       // 방송일
            ott: BroadcastOtt;          // OTT 플랫폼별 링크
            youtube: string[];          // 공식 유튜브 영상 URL 목록
        };

        // GET /restaurants - item
        type Item = {
            restaurantId: number;
            name: string;
            kakaoPlaceId: string | null;    // 카카오맵 place_id

            foodCategory: string | null;    // 음식 분류 카테고리
            mainFood: string | null;        // 대표 메뉴/카테고리 이름
            mainPhoto: string | null;       // 대표 사진 url
            address: string | null;         // 전체 주소 문자열

            longitude: number | null;       // 경도 (x)
            latitude: number | null;        // 위도 (y)

            ratingSum: number;      // 평점 합계
            reviewCount: number;    // 리뷰 개수
            likeCount: number;      // 좋아요 수

            tags: string[];     // 태그 목록 (분위기/상황/추가 food 태그 등)
            region: Region;
        };

        // GET /restaurants
        type List = {
            items: Item[];
            page: number;
            limit: number;
            total: number;
        };

        // GET /restaurants/:restaurantId
        type Detail = {
            restaurantId: number;       // 레스토랑 PK
            name: string;               // 가게 이름
            kakaoPlaceId: string | null;    // 카카오맵 place_id

            foodCategory: string | null;    // 음식 분류 카테고리
            mainFood: string | null;    // 대표 메뉴/카테고리 이름
            phone: string | null;       // 전화번호
            address: string | null;     // 전체 주소 문자열

            longitude: number | null;   // 경도 (x)
            latitude: number | null;    // 위도 (y)

            ratingSum: number;      // 평점 합계
            reviewCount: number;    // 리뷰 개수
            likeCount: number;      // 좋아요 수

            broadcasts: Broadcast[]; // 방송/OTT/유튜브 정보
            photos: PhotosGroup;    // 사진 그룹
            region: Region;         // 지역 depth1~2 이름

            tags: string[];     // 태그 목록 (분위기/상황/추가 food 태그 등)
        };
    }
}

export {};
