// types/inquiry.d.ts
import type { InquirySearchTarget, InquiryStatus, InquiryType } from './enum';

declare global {
  namespace inquiry {
    // ======= Controller → Service ==========
    type ListFilter = {
      page: number;
      limit: number;

      // Admin: 필터 (특정 유저/상태/유형)
      userId?: number; // GET me/inquiries
      status?: InquiryStatus;
      type?: InquiryType;

      // Admin: 검색
      q?: string;
      searchTarget?: InquirySearchTarget;
    };

    type CreatePayload = {
      type: InquiryType;
      title: string;
      content: string;
      imagePaths?: string[];
    };

    type AnswerPayload = {
      answer: string;
    };

    // ========== Service → Controller =======

    type Item = {
      inquiryId: number;
      title: string;
      content: string;
      type: InquiryType;
      status: InquiryStatus;
      createdAt: Date;
      answeredAt: Date | null;

      // Detail
      answer?: string | null;
      imagePaths?: string[];

      // Admin
      userId?: number | null;
      userNickname?: string | null;
      answeredByUserId?: number | null;
      answeredByUserNickname?: string | null;
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
