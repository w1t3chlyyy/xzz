// app/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  // Если есть сессия - редирект в ленту
  if (session) {
    redirect('/feed');
  }
  
  // Если нет сессии - редирект на онбординг
  redirect('/onboarding');
}
