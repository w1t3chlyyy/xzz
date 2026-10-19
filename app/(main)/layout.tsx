import { BottomNav } from "@/components/navigation/BottomNav";
import { TrialBanner } from "@/components/subscription/TrialBanner";
import { SubscriptionLockoutGuard } from "@/components/subscription/SubscriptionLockoutGuard";
import { AppProvider, RoleGate } from "@/components/providers/AppProvider";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="min-h-screen bg-[#F4F3FA] text-slate-900 pb-28 lg:pb-10 lg:pl-64">
        <RoleGate>
          <SubscriptionLockoutGuard>
            <main className="max-w-md md:max-w-2xl mx-auto px-3.5 md:px-6 pt-[max(env(safe-area-inset-top,0px)+3.5rem,4.25rem)] lg:pt-8">
              <TrialBanner />
              {children}
            </main>
            <BottomNav />
          </SubscriptionLockoutGuard>
        </RoleGate>
      </div>
    </AppProvider>
  );
}
