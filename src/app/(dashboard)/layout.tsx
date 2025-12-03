"use client";

import { ReactNode } from 'react';
import { OperationsProvider } from '@/hooks/use-operations';
import { MasterDataProvider } from '@/hooks/use-master-data';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { AuthGuard } from '@/app/auth-guard';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-slate-950 flex flex-col min-h-screen overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-800 px-4 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger className="-ml-1 text-slate-400 hover:text-white" />
            <Separator orientation="vertical" className="mr-2 h-4 bg-slate-700" />
            <div className="text-sm text-slate-400">
                Panel de Control
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <OperationsProvider>
              <MasterDataProvider>
                {children}
              </MasterDataProvider>
            </OperationsProvider>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
