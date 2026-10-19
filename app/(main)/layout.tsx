import { BottomNav } from "@/components/navigation/BottomNav";
import { TrialBanner } from "@/components/subscription/TrialBanner";
import { SubscriptionLockoutGuard } from "@/components/subscription/SubscriptionLockoutGuard";
import { RoleGate } from "@/components/providers/AppProvider";

// Раньше здесь был серверный supabase.auth.getUser() на КАЖДУЮ навигацию —
// сетевой запрос, блокирующий рендер любой страницы. Авторизация теперь одна,
// на старте приложения (AppProvider), поэтому переходы между страницами мгновенные.
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F3FA] text-slate-900 pb-24">
      <RoleGate>
        <SubscriptionLockoutGuard>
          <main className="max-w-md mx-auto px-3.5 pt-3">
            <TrialBanner />
            {children}
          </main>
          <BottomNav />
        </SubscriptionLockoutGuard>
      </RoleGate>
    </div>
  );
}
