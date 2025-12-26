// types/inquiry.d.ts
import type { InquirySearchTarget, InquiryStatus, InquiryType } from './enum';

declare global {
  namespace inquiry {
    // ======= Controller → Service ==========
    type ListFilter = {
      page: number;
      limit: number;

      userId?: number;
      status?: InquiryStatus;
      type?: InquiryType;

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
      answer: string | null;
      imagePaths: string[];
      answeredAt: Date | null;
    };

    // GET /inquiries
    type List = {
      items: Item[];
      page: number;
      limit: number;
      total: number;
    };

    // GET /admin/inquiries/:inquiryId
    type Admin = Item & {
      userId: number | null;
      userNickname: string | null;
      answeredByUserId: number | null;
      answeredByUserNickname: string | null;
    };

    // GET /admin/inquiries
    type AdminList = {
      items: Admin[];
      page: number;
      limit: number;
      total: number;
    };
  }
}

export {};
