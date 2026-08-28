// middleware.ts
export function middleware(request: Request) {
  const url = new URL(request.url);
  
  // Простая логика
  if (url.pathname === '/old') {
    return Response.redirect(new URL('/new', request.url));
  }
  
  return new Response(null, {
    status: 200,
    headers: {
      'x-middleware': 'true',
    },
  });
}

export const config = {
  matcher: ['/:path*'],
};
