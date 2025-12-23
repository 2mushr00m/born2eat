// types/me.d.ts
import type { UserRole, UserStatus } from './enum';

declare global {
  namespace me {
    // ======= Controller → Service ==========
    type UpdatePayload = {
      nickname?: string;
      phone?: string | null;
      profileUrl?: string | null;
    };

    // ========== Service → Controller =======
    type Me = {
      userId: number;
      email: string;
      nickname: string;
      role: UserRole;
      status: UserStatus;
      profileUrl: string | null;
    };
  }
}

export {};
