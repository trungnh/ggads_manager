import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth && req.auth.user?.role !== 'blocked';

  const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth');
  const isPublicRoute = ['/privacy'].includes(nextUrl.pathname);

  if (isApiAuthRoute) {
    return;
  }

  if (nextUrl.pathname === '/login' || nextUrl.pathname === '/register') {
    if (isLoggedIn) {
      return Response.redirect(new URL('/dashboard', nextUrl));
    }
    return;
  }

  if (isPublicRoute) {
    return;
  }

  if (!isLoggedIn) {
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }

    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    return Response.redirect(new URL(`/login?callbackUrl=${encodedCallbackUrl}`, nextUrl));
  }

  // Admin route protection
  if (nextUrl.pathname.startsWith('/admin')) {
    if (req.auth?.user?.role !== 'superadmin' && req.auth?.user?.role !== 'admin') {
      return Response.redirect(new URL('/', nextUrl));
    }
  }
});

// Optional: Configure middleware matching
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
