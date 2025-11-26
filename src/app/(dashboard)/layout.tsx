"use client";

import { ReactNode } from 'react';
import { OperationsProvider } from '@/hooks/use-operations';
import { MasterDataProvider } from '@/hooks/use-master-data';
import { AppSidebar } from '@/components/app-sidebar'; // Importamos el sidebar nuevo
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { FirebaseProvider, firebaseApp, auth, firestore } from '@/firebase'; 
import { Separator } from '@/components/ui/separator';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    /* 1. Conexión a Firebase */
    <FirebaseProvider firebaseApp={firebaseApp} auth={auth} firestore={firestore}>
      
      {/* 2. Proveedor de UI (Sidebar) */}
      <SidebarProvider>
        
        {/* A. Menú Lateral */}
        <AppSidebar />

        {/* B. Contenido Principal (Inset evita que el menú tape el contenido) */}
        <SidebarInset className="bg-slate-950 flex flex-col min-h-screen overflow-hidden">
            
            {/* Encabezado */}
            <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-800 px-4 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-10">
                <SidebarTrigger className="-ml-1 text-slate-400 hover:text-white" />
                <Separator orientation="vertical" className="mr-2 h-4 bg-slate-700" />
                <div className="text-sm text-slate-400">
                    Panel de Control
                </div>
            </header>

            {/* Área de contenido con scroll */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                
                {/* 3. Proveedores de Datos */}
                <MasterDataProvider>
                    <OperationsProvider>
                        {children}
                    </OperationsProvider>
                </MasterDataProvider>
                
            </div>

        </SidebarInset>

      </SidebarProvider>
    </FirebaseProvider>
  );
}