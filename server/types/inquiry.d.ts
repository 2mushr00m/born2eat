// types/inquiry.d.ts
import type { InquiryStatus, InquiryType } from './enum';

declare global {

    namespace inquiry {

        // ======= Controller → Service ==========
        type ListFilter = { // 목록 조회 filter
            status?: InquiryStatus;
            userId?: number;
            q?: string;
            page: number;
            limit: number;
        }

        type CreatePayload = { // 생성 payload
            type: InquiryType;
            title: string;
            content: string;
            imagePaths?: string[];
        }

        type AnswerPayload = { // 답변 payload
            answer: string;
        }
        
        
        // ========== Service → Controller =======
        type Item = { // GET /inquiries - item
            inquiryId: number;
            userId: number | null;
            userNickname: string | null;
            title: string;
            type: InquiryType;
            status: InquiryStatus;
            createdAt: Date;
            answeredAt: Date;
        }

        type List = { // GET /inquiries
            items: Item[];
            page: number;
            limit: number;
            total: number;
        }

        type Detail = { // GET /inquiries/:inquiryId
            inquiryId: number;
            userId: number | null;
            userNickname: string | null;
            title: string;
            content: string;
            type: InquiryType;
            status: InquiryStatus;
            createdAt: Date;
            answer: string | null;
            answeredAt: Date | null;
            imagePaths: string[];
        }

        type DetailAdmin = Detail & { // GET /admin/inquiries/:inquiryId
            answeredByUserId: number | null;
            answeredByUserNickname: string | null;
        }
    }
}
