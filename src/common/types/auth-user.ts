import type { Role } from '@prisma/client';

/** الشي يلي بيتخزن بـ request.user بعد ما الـ JwtStrategy يتحقق من الـ access token */
export interface AuthUser {
  id: number;
  role: Role;
  sid: number; // session id
}
