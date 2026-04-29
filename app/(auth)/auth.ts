//C:\Users\User\Desktop\Cloned\hume-voice-simulator\app\(auth)\auth.ts
import { compare } from "bcrypt-ts";
import NextAuth, { type DefaultSession, type AuthOptions } from "next-auth";
import type { JWT as BaseJWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider, { type GoogleProfile } from "next-auth/providers/google";
import type { Profile, Account, User as BaseUser } from "next-auth";
import { DUMMY_PASSWORD } from "@/lib/constants";
import { createGuestUser, createUser, getUser, getUserByGoogleSub } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { user as userTable } from "@/lib/db/schema";

interface DbUser {
  id: string;
  email: string | null;
  createdAt: Date;
  password: string | null;
  googleSub: string | null;
  role: "user" | "admin";
}

export type UserType = "guest" | "regular" | "google";

// Extend the base types without causing recursive references
declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      type: UserType;
      role: "user" | "admin";
      tokenBalance: number; 
    } & DefaultSession["user"];
  }
}

declare module "next-auth" {
  interface User {
    type?: UserType;
    role?: "user" | "admin";
    tokenBalance?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    type: UserType;
    role: "user" | "admin";
    tokenBalance: number; 
  }
}

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {},
      name: "Email and Password",
      async authorize({ email, password }: any) {
        const users = await getUser(email);
        if (users.length === 0) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }
        const [userRecord] = users;
        if (!userRecord.password) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }
        const passwordsMatch = await compare(password, userRecord.password);
        if (!passwordsMatch) {
          return null;
        }
        return { id: userRecord.id, email: userRecord.email, type: "regular" as const, role: userRecord.role };
      },
    }),
    Credentials({
      id: "guest",
      name: "Guest Login",
      credentials: {},
      async authorize() {
        const guestUser = await createGuestUser();
        if (!guestUser) return null;
        return {
          id: guestUser.id,
          email: guestUser.email,
          type: "guest" as const,
          role: guestUser.role,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user: authUser, account, profile }) {
      if (account?.provider === "google" && (profile as GoogleProfile)?.sub && (profile as GoogleProfile).email) {
        const existingUsers = (await getUserByGoogleSub((profile as GoogleProfile).sub)) as DbUser[];
        if (existingUsers.length === 0) {
          const newDbUser = (await createUser((profile as GoogleProfile).email, null)) as DbUser;
          await db.update(userTable).set({ googleSub: (profile as GoogleProfile).sub }).where(eq(userTable.id, newDbUser.id));
          authUser.id = newDbUser.id;
          authUser.role = newDbUser.role || "user";
        } else {
          const dbUser = existingUsers[0];
          authUser.id = dbUser.id;
          authUser.role = dbUser.role || "user";
        }
        authUser.type = "google" as const;
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? token.id ?? "";
        token.type = user.type ?? token.type ?? "regular";
        token.role = user.role ?? token.role ?? "user";
        token.email = user.email ?? token.email ?? "";
        token.tokenBalance = user.tokenBalance ?? 0; // Add this line
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.type = token.type;
        session.user.role = token.role;
        session.user.email = token.email ?? session.user.email;
        session.user.tokenBalance = token.tokenBalance ?? 0; // Add this line
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}/dashboard`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };