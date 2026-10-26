import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F4F3FA] flex items-center justify-center p-4 text-slate-900">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center space-y-4">
        <div className="font-heading text-4xl text-violet-600">404</div>
        <h1 className="text-xl font-extrabold">Страница не найдена</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Запрашиваемая страница не существует или была перемещена.
        </p>
        <Link href="/" className="btn-primary inline-flex py-2.5 px-6 rounded-2xl text-xs font-bold shadow-violet">
          На главную
        </Link>
      </div>
    </div>
  );
}
