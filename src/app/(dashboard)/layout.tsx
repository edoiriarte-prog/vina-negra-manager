
import { AuthGuard } from '@/app/auth-guard';
import { MainNav } from '@/components/main-nav';
import { Sidebar, SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { UserNav } from '@/components/user-nav';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { MasterDataProvider } from '@/hooks/use-master-data';
import { OperationsProvider } from '@/hooks/use-operations.tsx';
import { ViñaNegraLogo } from '@/components/viña-negra-logo';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseClientProvider>
      <AuthGuard>
        <SidebarProvider>
          <div className="flex min-h-screen bg-slate-950 text-slate-100">
              <Sidebar>
                <div className="flex h-16 items-center px-4 border-b border-slate-800">
                    <ViñaNegraLogo />
                </div>
                <MainNav />
              </Sidebar>

            <SidebarInset className="flex flex-col min-h-screen">
              {/* Header */}
              <div className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm px-4 md:px-6">
                 <div className="md:hidden">
                    <SidebarTrigger />
                  </div>
                <div className="flex-1" />
                <UserNav />
              </div>

              {/* Main Content */}
              <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <OperationsProvider>
                  <MasterDataProvider>
                    {children}
                  </MasterDataProvider>
                </OperationsProvider>
              </main>

            </SidebarInset>
          </div>
        </SidebarProvider>
      </AuthGuard>
    </FirebaseClientProvider>
  );
}
