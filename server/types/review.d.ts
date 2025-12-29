// types/review.d.ts

import { ReviewSearchTarget, ReviewSort } from './enum';

declare global {
  namespace review {
    // ======= Controller → Service ==========

    type ListFilter = {
      page: number;
      limit: number;
      sort: ReviewSort;

      // Admin: 필터 (특정 음식점/유저/숨김 여부)
      restaurantId?: number;
      userId?: number;
      isVisible?: boolean;

      // Admin: 검색
      q?: string;
      searchTarget?: ReviewSearchTarget;
    };

    type CreatePayload = {
      rating: number;
      content: string;
      tags?: string[]; // tagCode
      photos?: { filepath: string; caption?: string }[];
    };

    type UpdatePayload = {
      rating?: number;
      content?: string;
      tags?: string[];
      photosPatch?: {
        id: number;
        delete?: true;
        caption?: string | null;
      }[];
      photosUpload?: {
        id?: number | null;
        filepath: string;
        caption?: string;
      }[];
    };

    // ========== Service → Controller =======

    type Item = {
      reviewId: number;
      restaurantId: number;
      userId: number;
      userNickname: string;

      rating: number;
      content: string;
      isVisible: boolean;

      createdAt: Date;
      updatedAt: Date | null;

      likeCount: number;

      // Detail
      tags?: {
        id: number;
        code: string;
        name: string;
      }[];
      photos?: {
        id: number;
        path: string;
        caption: string | null;
      }[];

      // viewerLiked (Admin)
      viewerLiked?: boolean;
    };

    type List = {
      items: Item[];
      page: number;
      limit: number;
      total: number;
    };
  }
}

export {};
