"use client"

import * as React from "react"
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Package,
  Wallet,
  Users,
  FileText,
  Settings,
  LogOut,
  Briefcase,
  ClipboardList,
  Calendar
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

// --- CORRECCIÓN CRÍTICA: Importamos 'auth' directo, NO 'app' ---
import { signOut } from "firebase/auth";
import { auth } from "@/firebase"; 

const navMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Planificación", url: "/planning", icon: Calendar },
  { title: "Compras (O/C)", url: "/purchases", icon: ShoppingCart },
  { title: "Ventas (O/V)", url: "/sales", icon: Truck },
  { title: "Despachos", url: "/dispatches", icon: ClipboardList },
  { title: "Inventario", url: "/inventory", icon: Package },
  { title: "Tesorería", url: "/financials", icon: Wallet },
  { title: "Cta. Corriente", url: "/mercantile-account", icon: Briefcase },
  { title: "Contactos", url: "/contacts", icon: Users },
  { title: "Reportes", url: "/reports", icon: FileText },
  { title: "Configuración", url: "/settings", icon: Settings },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault(); // Evitamos recarga default
    try {
      await signOut(auth);
      console.log("Sesión cerrada");
      // Forzamos recarga total para limpiar memoria y permisos
      window.location.href = "/"; 
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-slate-800 bg-slate-950">
      <SidebarHeader className="border-b border-slate-800 bg-slate-950 h-16 flex justify-center">
        <div className="flex items-center gap-3 px-2 w-full">
            <div className="relative h-10 w-10 min-w-[40px] overflow-hidden rounded-md bg-white flex items-center justify-center">
                <Image src="/logo-avn.png" alt="AVN Logo" width={40} height={40} className="object-contain p-1" />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden transition-all duration-300">
                <span className="font-bold text-white text-lg leading-none tracking-tight">AVN</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Manager</span>
            </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-slate-950 pt-4">
        <SidebarGroup>
            <SidebarGroupLabel className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Navegación</SidebarGroupLabel>
            <SidebarMenu>
            {navMain.map((item) => {
                const isActive = pathname === item.url;
                return (
                <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title} isActive={isActive} className={`h-10 transition-all duration-200 ${isActive ? "bg-blue-600 text-white hover:bg-blue-500 font-medium" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}>
                    <Link href={item.url} className="flex items-center gap-3">
                        <item.icon className={isActive ? "text-white" : "text-slate-500"} size={18} />
                        <span>{item.title}</span>
                    </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                )
            })}
            </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-slate-800 bg-slate-950 p-4">
        <button type="button" onClick={handleLogout} className="flex items-center gap-3 text-sm text-slate-500 hover:text-red-400 w-full px-2 py-2 rounded-md hover:bg-slate-900 transition-all group cursor-pointer">
            <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
            <span className="group-data-[collapsible=icon]:hidden">Cerrar Sesión</span>
        </button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}