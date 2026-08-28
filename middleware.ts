// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Публичные маршруты (доступны без авторизации)
  const publicPaths = ['/api/auth', '/onboarding'];
  const isPublic = publicPaths.some(p => path.startsWith(p));
  
  // Если не публичный и нет сессии - редирект на онбординг
  const session = request.cookies.get('session')?.value;
  
  if (!isPublic && !session && path !== '/') {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }
  
  // Если есть сессия и на онбординге - редирект в ленту
  if (session && path.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/feed', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api (если нужно исключить API)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
