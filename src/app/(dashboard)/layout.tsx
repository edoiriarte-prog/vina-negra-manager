
import { AuthGuard } from '@/app/auth-guard';
import { MainNav } from '@/components/main-nav';
import { SidebarProvider } from '@/components/ui/sidebar';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { MasterDataProvider } from '@/hooks/use-master-data';
import { OperationsProvider } from '@/hooks/use-operations';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseClientProvider>
      <AuthGuard>
        <SidebarProvider>
          <div className="flex min-h-screen flex-col bg-slate-950 w-full">
            {/* Main Navigation */}
            <div className="border-b border-slate-800 bg-slate-950">
              <div className="flex h-16 items-center px-4">
                <MainNav className="mx-6" />
                <div className="ml-auto flex items-center space-x-4">
                  {/* Future UserNav can go here */}
                </div>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 space-y-4 p-8 pt-6">
              <OperationsProvider>
                <MasterDataProvider>
                  {children}
                </MasterDataProvider>
              </OperationsProvider>
            </div>
          </div>
        </SidebarProvider>
      </AuthGuard>
    </FirebaseClientProvider>
  );
}
