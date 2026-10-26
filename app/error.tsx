"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F4F3FA] flex items-center justify-center p-4 text-slate-900">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center space-y-4">
        <div className="font-heading text-4xl text-rose-500">500</div>
        <h1 className="text-xl font-extrabold">Произошла ошибка</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Что-то пошло не так. Попробуйте обновить страницу.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => reset()}
            className="btn-primary py-2.5 px-5 rounded-2xl text-xs font-bold shadow-violet"
          >
            Попробовать снова
          </button>
          <Link
            href="/"
            className="py-2.5 px-5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
