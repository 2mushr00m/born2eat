// types/auth.d.ts
import type { UserRole, UserStatus } from './enum';

declare global {
  namespace auth {
    // ======= Controller → Service ==========
    type SignupPayload = {
      email: string;
      password: string;
      phone?: string;
    };
    type LoginPayload = {
      email: string;
      password: string;
    };

    // ========== Service → Controller =======
  }
}

export {};
