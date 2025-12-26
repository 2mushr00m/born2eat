// types/user.d.ts
import type { UserRole, UserStatus } from './enum';

declare global {
  namespace user {
    // ======= Controller → Service ==========
    type UpdatePayload = {
      nickname?: string;
      phone?: string;
      profileUrl?: string | null;
    };
    type AdminUpdatePayload = UpdatePayload & {
      email?: string;
      status?: UserStatus;
      suspendedUntil?: Date | null;
    };
    type PasswordPayload = {
      currentPassword: string;
      newPassword: string;
    };

    // ========== Service → Controller =======

    // GET /users/:userId
    type Item = {
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
