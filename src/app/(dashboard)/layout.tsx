"use client";

import { ReactNode } from 'react';
import { OperationsProvider } from '@/hooks/use-operations';
import { MasterDataProvider } from '@/hooks/use-master-data';
import { MainNav } from '@/components/main-nav';
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AuthGuard } from '@/app/auth-guard';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <FirebaseClientProvider>
        <AuthGuard>
          <OperationsProvider>
            <MasterDataProvider>
              <div className="flex min-h-screen bg-slate-950 text-slate-100">
                <Sidebar>
                  <MainNav />
                </Sidebar>
                <SidebarInset>
                  <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                    <SidebarTrigger className="md:hidden" />
                  </header>
                  <main className="flex-1 p-4 md:p-6">{children}</main>
                </SidebarInset>
              </div>
            </MasterDataProvider>
          </OperationsProvider>
        </AuthGuard>
      </FirebaseClientProvider>
    </SidebarProvider>
  );
}
