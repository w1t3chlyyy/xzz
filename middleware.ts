// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// НЕ ИСПОЛЬЗУЙТЕ этот импорт в Edge:
// import { cookies } from 'next/headers'; // ❌ НЕ РАБОТАЕТ В EDGE

export function middleware(request: NextRequest) {
  // Работаем с request напрямую
  const url = request.nextUrl;
  const pathname = url.pathname;
  
  // Проверяем куки через request
  const session = request.cookies.get('session')?.value;
  
  // Пример: защита маршрутов
  if (pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
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
