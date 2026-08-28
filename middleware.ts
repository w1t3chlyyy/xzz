import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Получаем session из cookies
  const session = request.cookies.get('session')?.value;
  
  // Проверяем, защищен ли маршрут
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth');
  const isProtectedPage = !isAuthPage;

  if (isProtectedPage && !session) {
    const redirectUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
