// types/review.d.ts

import { ReivewSort } from './enum';

declare global {
  namespace review {
    // ======= Controller → Service ==========

    type ListFilter = {
      page: number;
      limit: number;

      restaurantId?: number;
      userId?: number;

      sort?: ReivewSort;
      isVisible?: boolean;

      q?: string;
      searchTarget?: string;
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
      photoUpload?: {
        targetId?: number | null;
        filepath: string;
        cpation?: string;
      }[];
    };

    // ========== Service → Controller =======
    type Photo = {
      id: number;
      path: string;
      caption: string | null;
    };

    type Item = {
      reviewId: number;
      restaurantId: number;
      userId: number;
      userNickname: string;

      rating: number;
      content: string;

      createdAt: Date;
      updatedAt: Date;
      isVisible: boolean;

      likeCount: number;
      viewerLiked: boolean;

      tags: {
        id: number;
        code: string;
        name: string;
      }[];
      photos: Photo[];
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
