// middleware.ts
// ❌ НЕ ИСПОЛЬЗУЙТЕ ЭТИ ИМПОРТЫ В EDGE:
// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// ✅ ИСПОЛЬЗУЙТЕ NATIVE WEB API:
export function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Получаем куки через заголовки
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(c => {
      const [key, ...value] = c.split('=');
      return [key, value.join('=')];
    })
  );
  
  const session = cookies.session;
  
  // Простая логика редиректа
  if (!session && pathname.startsWith('/feed')) {
    return Response.redirect(new URL('/onboarding', request.url));
  }
  
  if (session && pathname.startsWith('/onboarding')) {
    return Response.redirect(new URL('/feed', request.url));
  }
  
  // Пропускаем запрос дальше
  return new Response(null, {
    status: 200,
    headers: {
      'x-middleware': 'true',
    },
  });
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
