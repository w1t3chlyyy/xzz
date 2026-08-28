// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request: Request) {
  // Пропускаем все запросы
  return NextResponse.next();
}

// Не используем matcher, чтобы не блокировать ничего
