
"use client"

import React, { useEffect, useState } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { MainNav } from './main-nav';

// NOTA: Hemos quitado "UserNav" temporalmente para detener el bucle infinito.

export default function PrincipalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar className="print:hidden" side="left" variant="sidebar" collapsible="icon">
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
          {/* Espacio reservado para el usuario futuro */}
          <div className="h-10 w-full" /> 
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
  );
}
