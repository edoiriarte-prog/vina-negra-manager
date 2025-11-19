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

export default function PrincipalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. PROTECCIÓN ANTI-CRASH PARA MÓVILES
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null; 
  }

  return (
    <SidebarProvider>
      {/* Barra lateral (Sidebar) */}
      <Sidebar className="print:hidden" side="left" variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-0">
          <Logo />
        </SidebarHeader>
        <SidebarContent className="p-0">
          <div className="flex flex-col h-full p-2 md:p-3"> {/* Optimizado para móvil */}
            <MainNav />
          </div>
        </SidebarContent>
        <SidebarFooter>
          <Separator className="my-2" />
          {/* Espacio reservado para evitar errores de usuario */}
          <div className="h-10 w-full" /> 
        </SidebarFooter>
      </Sidebar>
      
      {/* Contenido Principal */}
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 sticky top-0 z-30 print:hidden">
          <SidebarTrigger /> 
          <div className="flex-1">
          </div>
        </header>
        
        {/* 2. MEJORA VISUAL MÓVIL: Padding ajustado (p-3 en celus, p-6 en PC) */}
        <main className="flex-1 overflow-auto p-3 md:p-6 print:p-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}