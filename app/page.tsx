// app/page.tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
  // Редирект на ленту или онбординг
  redirect('/feed');
  
  // Или если нужна отдельная главная:
  // return <div>Добро пожаловать в Fiolet!</div>;
}
