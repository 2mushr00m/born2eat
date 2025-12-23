// types/inquiry.d.ts
import type { InquiryStatus, InquiryType } from './enum';

declare global {
  namespace inquiry {
    // ======= Controller → Service ==========
    type ListFilter = {
      status?: InquiryStatus;
      userId?: number;
      q?: string;
      page: number;
      limit: number;
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

    // GET /inquiries - item
    type Item = {
      inquiryId: number;
      userId: number | null;
      userNickname: string | null;
      title: string;
      type: InquiryType;
      status: InquiryStatus;
      createdAt: Date;
      answeredAt: Date;
    };

    // GET /inquiries
    type List = {
      items: Item[];
      page: number;
      limit: number;
      total: number;
    };

    // GET /inquiries/:inquiryId
    type Detail = {
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
    };

    // GET /admin/inquiries/:inquiryId
    type DetailAdmin = Detail & {
      answeredByUserId: number | null;
      answeredByUserNickname: string | null;
    };
  }
}
