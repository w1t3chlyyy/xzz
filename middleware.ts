import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // Создаем ответ
  const response = NextResponse.next();
  
  // Создаем клиент Supabase с Edge-совместимыми методами
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Устанавливаем cookie в ответе
          response.cookies.set({
            name,
            value,
            ...options,
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          });
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
            path: '/',
            maxAge: 0,
          });
        },
      },
    }
  );

  // Обновляем сессию
  await supabase.auth.getSession();

  return response;
}

// НЕ используем config.matcher, а используем export const config
export const config = {
  runtime: 'edge', // Явно указываем Edge
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
