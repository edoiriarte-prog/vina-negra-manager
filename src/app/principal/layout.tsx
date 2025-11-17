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
import { MainNav } from './main-nav';

export default function PrincipalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      {/* defaultOpen={true} fuerza a que el menú aparezca abierto */}
      <SidebarProvider defaultOpen={true}>
        <Sidebar className="print:hidden" side="left" variant="sidebar" collapsible="icon">
          <SidebarHeader className="p-0">
            <Logo />
          </SidebarHeader>
          <SidebarContent className="p-0">
            <div className="flex flex-col h-full p-3">
              {/* Aquí cargamos tu menú de navegación */}
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
            <SidebarTrigger /> 
            <div className="flex-1">
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6 print:p-0">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
