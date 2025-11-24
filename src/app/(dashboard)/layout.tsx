// --- 1. IMPORTAMOS EL NUEVO PROVIDER ---
import { MasterDataProvider } from "@/hooks/use-master-data"; 
import { MainNav } from "./main-nav";
import { AuthGuard } from '../auth-guard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // --- 2. ENVOLVEMOS LA APP CON EL PROVIDER ---
    <AuthGuard>
      <MasterDataProvider>
        <div className="flex min-h-screen bg-slate-950 text-slate-100">
          <MainNav />
          <main className="flex-1 ml-64 flex flex-col min-h-screen transition-all duration-300">
            <div className="flex-1 p-3 md:p-6">{children}</div>
          </main>
        </div>
      </MasterDataProvider>
    </AuthGuard>
  );
}
