import { AppProvider } from "@/components/providers/AppProvider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}
