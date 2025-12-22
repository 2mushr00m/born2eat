// types/review.d.ts

declare global {

    namespace review {

        // ======= Controller → Service ==========
        type ListFilter = { // 목록 조회 filter
            restaurantId?: number;
            userId?: number;
            isVisible?: boolean;
            q?: string;
            page: number;
            limit: number;
        }

        type CreatePayload = { // 생성 payload
            rating: number;
            content: string;
            tagIds?: number[];
            photoPaths?: string[];
        }

        type UpdatePayload = { // 수정 payload
            rating?: number;
            content?: string;
            tagIds?: number[] | null;
            photoPaths?: string[] | null;
        };

        
        // ========== Service → Controller =======
        type Item = { // GET /inquiries - item
            reviewId: number;
            restaurantId: number;
            userId: number;
            userNickname: string | null;
            
            rating: number;
            content: string;

            createdAt: Date;
            updatedAt: Date;
            isVisible: 0 | 1;

            likeCount: number;
            viewerLiked: boolean;

            tags: string[];
            photoPaths: string[];
        }

        type List = { // GET /inquiries, // GET /me/inquiries, // GET /admin/inquiries
            items: Item[];
            page: number;
            limit: number;
            total: number;
        }
    }
}
