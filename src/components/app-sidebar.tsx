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
  ClipboardList
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

// Menú de navegación
const navMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
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

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-slate-800 bg-slate-950">
      <SidebarHeader className="border-b border-slate-800 bg-slate-950">
        <div className="flex h-12 items-center px-4 font-bold text-white text-lg">
           <span className="text-blue-500 mr-1">VN</span> Manager
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-slate-950">
        <SidebarGroup>
            <SidebarGroupLabel className="text-slate-500">Menu</SidebarGroupLabel>
            <SidebarMenu>
            {navMain.map((item) => {
                const isActive = pathname === item.url;
                return (
                <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                        asChild 
                        tooltip={item.title} 
                        isActive={isActive}
                        className={isActive ? "bg-blue-600 text-white hover:bg-blue-500 hover:text-white" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"}
                    >
                    <Link href={item.url}>
                        <item.icon className={isActive ? "text-white" : "text-slate-500"} />
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
        <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-400 w-full px-2 transition-colors">
            <LogOut className="h-4 w-4" />
            <span>Cerrar Sesión</span>
        </button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}