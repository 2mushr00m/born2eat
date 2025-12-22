// types/user.d.ts
import type { UserRole, UserStatus } from './enum';

declare global {

    namespace user {

        // ======= Controller → Service ==========
        type UpdatePayload = { // 수정 payload
            email?: string;
            nickname?: string;
            phone?: string;
            profileUrl?: string | null;
            status?: UserStatus;
            suspendedUntil?: Date | null;
        }
        
        // ========== Service → Controller =======
        type Basic = { // GET /users/:userId
            userId: number;
            email: string;
            nickname: string;
            profileUrl: string | null;
            role: UserRole;
            status: UserStatus;
            suspendedUntil: Date | null;
        }

    }
}