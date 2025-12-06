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
  Calendar,
  Leaf // Icono opcional para cuando la barra se encoge
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
    e.preventDefault(); 
    try {
      await signOut(auth);
      window.location.href = "/"; 
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-slate-800 bg-slate-950">
      
      {/* --- ENCABEZADO MEJORADO (LOGO PROTAGONISTA) --- */}
      <SidebarHeader className="border-b border-slate-800 bg-slate-950 h-24 flex justify-center py-4">
        
        {/* Versión Expandida: Logo Completo Grande */}
        <div className="group-data-[collapsible=icon]:hidden w-full h-full flex items-center justify-center px-4 transition-all duration-300">
            <div className="relative w-full h-full">
               <Image 
                 src="/logo-avn.png" 
                 alt="AVN Agro Manager" 
                 fill 
                 className="object-contain drop-shadow-[0_0_15px_rgba(34,211,238,0.15)]" // Efecto de brillo sutil
                 priority
               />
            </div>
        </div>

        {/* Versión Colapsada (Icono Pequeño) */}
        <div className="hidden group-data-[collapsible=icon]:flex w-full h-full items-center justify-center">
            <div className="bg-gradient-to-br from-emerald-500 to-blue-600 p-2 rounded-lg shadow-lg shadow-emerald-500/20">
                <Leaf className="text-white h-5 w-5" />
            </div>
        </div>

      </SidebarHeader>

      <SidebarContent className="bg-slate-950 pt-6 custom-scrollbar">
        <SidebarGroup>
            <SidebarGroupLabel className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-3 px-4 group-data-[collapsible=icon]:hidden">
              Menu Principal
            </SidebarGroupLabel>
            <SidebarMenu>
            {navMain.map((item) => {
                const isActive = pathname === item.url;
                return (
                <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                        asChild 
                        tooltip={item.title} 
                        isActive={isActive} 
                        className={`
                            h-11 mx-2 mb-1 rounded-xl transition-all duration-300 border 
                            ${isActive 
                                ? "bg-gradient-to-r from-blue-900/40 to-slate-900 border-blue-500/30 text-blue-400 shadow-[0_0_15px_-3px_rgba(59,130,246,0.2)]" 
                                : "border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200 hover:border-slate-800"
                            }
                        `}
                    >
                    <Link href={item.url} className="flex items-center gap-3.5">
                        <item.icon 
                            className={`transition-colors duration-300 ${isActive ? "text-blue-400 fill-blue-400/10" : "text-slate-500 group-hover:text-slate-300"}`} 
                            size={20} 
                            strokeWidth={isActive ? 2 : 1.5} 
                        />
                        <span className={`font-medium tracking-wide ${isActive ? "text-blue-100" : ""}`}>{item.title}</span>
                    </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                )
            })}
            </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-slate-800 bg-slate-950 p-4">
        <button 
            type="button" 
            onClick={handleLogout} 
            className="flex items-center gap-3 text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-950/20 w-full px-3 py-3 rounded-xl transition-all group cursor-pointer border border-transparent hover:border-red-900/30"
        >
            <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
            <span className="group-data-[collapsible=icon]:hidden">Cerrar Sesión</span>
        </button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}