import { MainNav } from "./main-nav";
import { AuthGuard } from "@/app/auth-guard";
import { FirebaseClientProvider } from "@/firebase/client-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseClientProvider>
      <AuthGuard>
        <div className="flex min-h-screen bg-slate-950 text-slate-100">
          <MainNav />
          <main className="flex-1 ml-64 flex flex-col min-h-screen transition-all duration-300">
            <div className="flex-1 p-3 md:p-6">{children}</div>
          </main>
        </div>
      </AuthGuard>
    </FirebaseClientProvider>
  );
}

    