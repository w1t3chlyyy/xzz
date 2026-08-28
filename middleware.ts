import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Просто пропускаем все запросы
  return NextResponse.next();
}

// Указываем, что middleware работает на всех маршрутах, кроме статики
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
