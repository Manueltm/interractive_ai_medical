//C:\Users\User\Desktop\New Cloned\academy\acemedixacademy\app\(auth)\auth.config.ts

import type { AuthOptions } from "next-auth";

export const authConfig: AuthOptions = {
  pages: {
    signIn: "/login",
    newUser: "/",
  },
  providers: [
    // add providers in auth.ts
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id; // ensure DB user.id is stored
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
};