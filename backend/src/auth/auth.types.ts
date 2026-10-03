import type { Request } from 'express';
import 'express-session';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
}
export interface AuthRequest extends Request {
  authUser?: AuthUser;
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    csrfToken?: string;
  }
}
