// middleware.ts
import { NextResponse } from 'next/server';

export async function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Получаем куки из заголовков
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies: Record<string, string> = {};
  cookieHeader.split('; ').forEach(cookie => {
    const [key, ...value] = cookie.split('=');
    cookies[key] = value.join('=');
  });
  
  // Проверяем наличие сессии Supabase
  const hasSession = !!cookies['sb-access-token'] || !!cookies['session'];
  
  // Публичные маршруты (доступны без сессии)
  const publicPaths = ['/onboarding'];
  const isPublic = publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'));
  
  // API маршруты пропускаем
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }
  
  // Если нет сессии и не на публичном маршруте - редирект на онбординг
  if (!hasSession && !isPublic && pathname !== '/') {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }
  
  // Если есть сессия и на онбординге - редирект в ленту
  if (hasSession && pathname.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/feed', request.url));
  }
  
  // Для главной страницы редиректим
  if (pathname === '/') {
    return NextResponse.redirect(new URL(hasSession ? '/feed' : '/onboarding', request.url));
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
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
