import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/navigation/BottomNav";
import { TrialBanner } from "@/components/subscription/TrialBanner";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const supabase = await createClient();
    await supabase.auth.getUser();
  } catch (error) {
    console.warn("MainLayout auth check:", error);
  }

  return (
    <div className="min-h-screen bg-[#F4F3FA] text-slate-900 pb-24">
      <main className="max-w-md mx-auto px-3.5 pt-3">
        <TrialBanner />
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
