// types/user.d.ts
import type { UserRole, UserStatus } from './enum';

declare global {
  namespace user {
    // ======= Controller → Service ==========
    type UpdatePayload = {
      email?: string;
      nickname?: string;
      phone?: string;
      profileUrl?: string | null;
      status?: UserStatus;
      suspendedUntil?: Date | null;
    };

    // ========== Service → Controller =======

    // GET /users/:userId
    type Basic = {
      userId: number;
      email: string;
      nickname: string;
      profileUrl: string | null;
      role: UserRole;
      status: UserStatus;
      suspendedUntil: Date | null;
    };
  }
}
