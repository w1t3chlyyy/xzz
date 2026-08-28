// middleware.ts
// ❌ НЕТ импортов из next/server
// ✅ Используем только нативные Web API

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
  const hasSession = !!(
    cookies['sb-access-token'] || 
    cookies['sb-refresh-token'] || 
    cookies['session']
  );
  
  // Публичные маршруты
  const isOnboarding = pathname === '/onboarding' || pathname.startsWith('/onboarding/');
  const isApi = pathname.startsWith('/api');
  const isStatic = pathname.startsWith('/_next') || pathname.includes('.') && 
                   !pathname.startsWith('/api');
  
  // Пропускаем API и статику
  if (isApi || isStatic) {
    return new Response(null, { status: 200 });
  }
  
  // Если нет сессии и не на онбординге
  if (!hasSession && !isOnboarding && pathname !== '/') {
    return Response.redirect(new URL('/onboarding', request.url));
  }
  
  // Если есть сессия и на онбординге
  if (hasSession && isOnboarding) {
    return Response.redirect(new URL('/feed', request.url));
  }
  
  // Если главная страница
  if (pathname === '/') {
    return Response.redirect(new URL(hasSession ? '/feed' : '/onboarding', request.url));
  }
  
  // Пропускаем запрос
  return new Response(null, { status: 200 });
}

export const config = {
  runtime: 'edge',
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
