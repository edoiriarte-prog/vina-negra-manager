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
import { MainNav } from '@/components/main-nav';
import { UserNav } from '@/components/user-nav';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/hooks/use-sidebar';

function SettingsLink() {
  const { state } = useSidebar();
  return (
    <Link href="/settings" className="mt-auto">
       <Button variant="ghost" className="w-full justify-start gap-3 p-2 text-sm h-10 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-2">
        <Settings className="h-5 w-5" />
        <span className="truncate group-data-[collapsible=icon]:hidden">Configuración</span>
       </Button>
    </Link>
  )
}


export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Sidebar className="print:hidden">
        <SidebarHeader className="p-0">
          <Logo />
        </SidebarHeader>
        <SidebarContent className='p-0'>
          <div className="flex flex-col h-full p-3">
            <MainNav />
            <SettingsLink />
          </div>
        </SidebarContent>
        <SidebarFooter>
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
  );
}
