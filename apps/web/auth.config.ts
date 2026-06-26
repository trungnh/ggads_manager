import type { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { db, users } from '@repo/db';
import { eq } from 'drizzle-orm';

export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/spreadsheets.readonly"
        }
      }
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const userRecord = await db.query.users.findFirst({
          where: eq(users.username, credentials.username as string)
        });

        if (!userRecord || !userRecord.passwordHash) {
          return null;
        }

        // 1. Kiểm tra xác minh email
        if (userRecord.isVerified === false) {
          throw new Error("Tài khoản của bạn chưa được xác minh qua email. Vui lòng kích hoạt tài khoản để đăng nhập.");
        }

        // 2. Kiểm tra trạng thái tài khoản
        if (userRecord.status === 'inactive') {
          throw new Error("Tài khoản của bạn đã bị khóa");
        }

        // 2. Kiểm tra ngày hết hạn tài khoản
        if (userRecord.expireAt && new Date(userRecord.expireAt) < new Date()) {
          throw new Error("Tài khoản của bạn đã hết hạn sử dụng");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          userRecord.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.username,
          role: userRecord.role,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // 1. If this is a fresh sign-in (Credentials or OAuth start)
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'user';
      }

      // 2. Handle Google OAuth connection/linking (Strictly Decoupled)
      if (account && account.provider === 'google' && account.access_token) {
        const { db, oauthConnections, users } = await import('@repo/db');
        const { eq } = await import('drizzle-orm');
        const { cookies } = await import('next/headers');

        const oauthEmail = profile?.email || (account as any).email;
        if (!oauthEmail) return token;

        // A. Identify the Target User for this connection
        // Priority 1: Current Session User (token.id)
        // Priority 2: Linking Cookie (auth_linking_user_id) - for redirects that lose session
        let targetSystemUserId = token.id as string;
        const cookieStore = await cookies();
        const linkingCookie = cookieStore.get('auth_linking_user_id')?.value;

        if (linkingCookie) {
          targetSystemUserId = linkingCookie;
          // Clean up cookie after reading
          // cookies().delete('auth_linking_user_id'); // Can't delete in JWT, but it's okay, it will expire
        }

        // B. Logic Selection: LINKING vs SIGN-IN
        if (targetSystemUserId) {
          // --- FLOW 1: LINKING (User is already in system) ---
          // Verify user exists to avoid FK constraint violation (e.g. if user was deleted but session is stale)
          const userExists = await db.query.users.findFirst({
            where: eq(users.id, targetSystemUserId)
          });

          if (!userExists) {
            throw new Error("Target user for linking does not exist or session is stale.");
          }

          // Just save the token, DO NOT change token.id, DO NOT look up user by oauthEmail
          const expiresAt = new Date(Date.now() + (account.expires_in as number) * 1000);
          
          await db.insert(oauthConnections).values({
            userId: targetSystemUserId,
            provider: 'google',
            email: oauthEmail,
            accessToken: account.access_token,
            refreshToken: account.refresh_token || '',
            expiresAt: expiresAt,
          }).onConflictDoUpdate({
            target: [oauthConnections.userId, oauthConnections.provider, oauthConnections.email],
            set: {
              accessToken: account.access_token,
              refreshToken: account.refresh_token || undefined,
              expiresAt: expiresAt,
              updatedAt: new Date(),
            }
          });

          // Restore all token attributes to the system user's attributes (no switching!)
          token.id = userExists.id;
          token.role = userExists.role || 'user';
          token.name = userExists.username;
          token.email = userExists.email || userExists.username;
        } else {
          // --- FLOW 2: SIGN-IN (DISABLE GOOGLE SIGN-IN) ---
          // We strictly prohibit logging in via Google if not already in a session.
          throw new Error("Direct Google Sign-in is disabled. Please login with username/password first.");
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;

        // Chặn gọi DB nếu đang chạy ở Edge Runtime (như NextAuth API Route /api/auth/session ở Edge)
        // để tránh lỗi: The edge runtime does not support Node.js 'net' module.
        if (process.env.NEXT_RUNTIME === 'edge') {
          return session;
        }

        try {
          const { db, users } = await import('@repo/db');
          const { eq } = await import('drizzle-orm');

          const userRecord = await db.query.users.findFirst({
            where: eq(users.id, token.id as string)
          });

          // Nếu tài khoản bị xóa, bị khóa hoặc hết hạn sử dụng
          if (!userRecord || userRecord.status === 'inactive' || (userRecord.expireAt && new Date(userRecord.expireAt) < new Date())) {
            return {
              ...session,
              user: {
                ...session.user,
                role: 'blocked', // Đánh dấu vai trò bị khóa
              },
              expires: new Date(0).toISOString() // Buộc session hết hạn lập tức
            };
          }

          // Cập nhật lại vai trò thực tế mới nhất từ DB
          session.user.role = userRecord.role || 'user';
        } catch (error) {
          console.error("Session active check error:", error);
        }
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
} satisfies NextAuthConfig;
