"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Boxes,
  LayoutDashboard,
  Landmark,
  ShoppingCart,
  ShoppingBag,
  Truck,
  Users,
  BarChart,
  HelpCircle,
  FileSliders,
  Settings,
  PackageCheck,
} from "lucide-react"

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

// Definimos las rutas asegurándonos de que apunten a /principal/...
const menuItems = [
  { href: "/principal/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/principal/contacts", label: "Contactos", icon: Users },
  { href: "/principal/purchases", label: "Compras (O/C)", icon: ShoppingBag },
  { href: "/principal/sales", label: "Ventas (O/V)", icon: ShoppingCart },
  { href: "/principal/dispatches", label: "Orden de Salida", icon: PackageCheck },
  { href: "/principal/services", label: "Servicios (O/S)", icon: Truck },
  { href: "/principal/inventory", label: "Inventario", icon: Boxes },
  { href: "/principal/inventory-adjustments", label: "Ajustes de Inventario", icon: FileSliders },
  { href: "/principal/financials", label: "Tesorería", icon: Landmark },
  { href: "/principal/mercantile-account", label: "Cta. Corriente Mercantil", icon: BarChart },
  { href: "/principal/settings", label: "Configuración", icon: Settings },
  { href: "/principal/help", label: "Ayuda", icon: HelpCircle },
]

export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex flex-col", className)}>
      <SidebarMenu>
        {menuItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href}>
              <SidebarMenuButton
                isActive={pathname.startsWith(item.href)}
                tooltip={item.label}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </nav>
  )
}