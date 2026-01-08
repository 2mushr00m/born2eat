// types/restaurant.d.ts
import type { RestaurantDataStatus, RestaurantPhotoSource, RestaurantPhotoType, RestaurantSort } from './enum';

declare global {
  namespace restaurant {
    // ======= Controller → Service ==========
    type ListFilter = {
      page: number;
      limit: number;
      sort: RestaurantSort;

      // All: 필터
      food?: string;
      tags?: string[];
      region?: string;

      // Admin: 필터
      isPublished?: boolean;
      dataStatus?: RestaurantDataStatus;

      // All: 검색 (이름, 주소, 대표메뉴, 분류)
      q?: string;
    };

    type CreatePayload = {
      name: string;
      description?: string;
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

    type UpdatePayload = {
      name?: string;
      description?: string | null;
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

    type CreatePhotosPayload = {
      sourceType: RestaurantPhotoSource;
      sourceUserId: number | null;
      photos: {
        photoType: RestaurantPhotoType;
        sortOrder?: number | null;
        filePath: string;
        caption?: string | null;
      }[];
    };

    // ========== Service → Controller =======
    type Photo = {
      filePath: string;
      caption: string | null;
      createdAt: Date;
      sourceType: RestaurantPhotoSource;
      sourceUserNickname: string | null;
    };

    type Region = {
      code: string | null; // 법정동 코드(10자리) (예: 1100100110)
      depth1: string | null; // 시/도 (예: '서울특별시')
      depth2: string | null; // 시/군/구 (예: '강남구')
    };

    type Broadcast = {
      name: string;
      episodeNo: number | null;
      airedAt: Date | null;
      ott: {
        NETFLIX?: string | null;
        TVING?: string | null;
        WAVVE?: string | null;
        WATCHA?: string | null;
      };
      youtube: string[];
    };

    // GET /restaurants - item
    type Item = {
      restaurantId: number;
      name: string;
      kakaoPlaceId: string | null;

      foodCategory: string | null;
      mainFood: string | null;
      mainPhoto: string | null;
      address: string | null;

      longitude: number | null;
      latitude: number | null;

      ratingSum: number;
      reviewCount: number;
      likeCount: number;

      tags: string[];
      region: Region;

      // ViewerLiked
      viewerLiked?: boolean;

      // Admin
      isPublished?: boolean;
      dataStatus?: RestaurantDataStatus;
    };

    // GET /restaurants
    type List = {
      items: Item[];
      page: number;
      limit: number;
      total: number;
    };

    type LikedList = {
      items: {
        restaurantId: number;
        name: string;
        mainPhoto: string | null;
        region: Region;
      }[];
      page: number;
      limit: number;
      total: number;
    };

    type DetailBase = {
      restaurantId: number;
      name: string;
      description: string | null;
      kakaoPlaceId: string | null;

      foodCategory: string | null;
      mainFood: string | null;
      phone: string | null;
      address: string | null;

      longitude: number | null;
      latitude: number | null;

      ratingSum: number;
      reviewCount: number;
      likeCount: number;

      viewerLiked?: boolean;
    };

    // GET /restaurants/:restaurantId
    type Detail = RestaurantBase & {
      broadcasts: Broadcast[];
      photos: {
        main: Photo[];
        menuBoard: Photo[];
        etc: Photo[];
      };
      region: Region;
      tags: string[];
    };

    // GET /admin/restaurants/:restaurantId
    type AdminDetail = DetailBase & {
      photos: {
        main: (PhotoBase & { photoId: number })[];
        menuBoard: (PhotoBase & { photoId: number })[];
        etc: (PhotoBase & { photoId: number })[];
      };
      tags: { tagId: number; code: string; name: string }[];
      region: Region;
      tags: string[];

      isPublished: boolean;
      dataStatus: RestaurantDataStatus;
    };

    type CreatedPhotos = {
      createdCount: number;
      photos: {
        main: Photo[];
        menuBoard: Photo[];
        etc: Photo[];
      };
    };
  }
}

export {};
