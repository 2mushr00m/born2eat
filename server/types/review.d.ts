// types/review.d.ts

declare global {
  namespace review {
    // ======= Controller → Service ==========

    type ListFilter = {
      restaurantId?: number;
      userId?: number;
      isVisible?: boolean;
      q?: string;
      page: number;
      limit: number;
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
      photos?: {
        id: number;
        path: string | null;
        caption: string | null;
      }[];
    };

    // ========== Service → Controller =======
    type Tag = {
      id: number;
      name: string;
    };

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

      tags: Tag[];
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
