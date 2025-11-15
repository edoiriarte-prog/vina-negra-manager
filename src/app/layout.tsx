import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import React from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { UserNav } from '@/components/user-nav';
import { Separator } from '@/components/ui/separator';
import { AuthGuard } from '@/app/auth-guard';
import { MainNav } from '@/app/main-nav';


export const metadata = {
  title: 'Viña Negra Manager',
  description: 'Gestión de operaciones para Viña Negra',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <FirebaseClientProvider>
          <AuthGuard>
            <SidebarProvider>
              <Sidebar className="print:hidden">
                <SidebarHeader className="p-0">
                  <Logo />
                </SidebarHeader>
                <SidebarContent className="p-0">
                  <div className="flex flex-col h-full p-3">
                    <MainNav />
                  </div>
                </SidebarContent>
                <SidebarFooter>
                  <Separator className="my-2" />
                  <UserNav />
                </SidebarFooter>
              </Sidebar>
              <SidebarInset>
                <header className="flex h-14 items-center gap-4 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 sticky top-0 z-30 print:hidden">
                  <SidebarTrigger className="md:hidden" />
                  <div className="flex-1">
                    <h1 className="text-lg font-semibold md:text-xl"></h1>
                  </div>
                </header>
                <main className="flex-1 overflow-auto p-4 md:p-6 print:p-0">{children}</main>
              </SidebarInset>
            </SidebarProvider>
          </AuthGuard>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
