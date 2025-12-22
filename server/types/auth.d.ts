// types/auth.d.ts
import type { UserRole, UserStatus } from './enum';

declare global {

    namespace auth {

        // ======= Controller → Service ==========
        type SignupPayload = { // 회원가입 payload
            email: string;
            password: string;
            phone?: string;
        };
        type LoginPayload = { // 로그인 payload
            email: string;
            password: string;
        };

        // ========== Service → Controller =======
        
    }
}

export {};
