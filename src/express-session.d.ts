// src/express-session.d.ts
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user: { 
      isAdmin: boolean;
      username: string; 
      role: string; 
    };
  }
}



