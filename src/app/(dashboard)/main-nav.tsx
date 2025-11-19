"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Boxes, LayoutDashboard, Landmark, ShoppingCart, ShoppingBag, Truck,
  Users, BarChart, HelpCircle, FileSliders, Settings, PackageCheck,
} from "lucide-react"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contactos", icon: Users },
  { href: "/purchases", label: "Compras (O/C)", icon: ShoppingBag },
  { href: "/sales", label: "Ventas (O/V)", icon: ShoppingCart },
  { href: "/dispatches", label: "Orden de Salida", icon: PackageCheck },
  { href: "/services", label: "Servicios (O/S)", icon: Truck },
  { href: "/inventory", label: "Inventario", icon: Boxes },
  { href: "/inventory-adjustments", label: "Ajustes de Inventario", icon: FileSliders },
  { href: "/financials", label: "Tesorería", icon: Landmark },
  { href: "/mercantile-account", label: "Cta. Corriente Mercantil", icon: BarChart },
  { href: "/settings", label: "Configuración", icon: Settings },
  { href: "/help", label: "Ayuda", icon: HelpCircle },
]

export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex flex-col", className)}>
      <SidebarMenu>
        {menuItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} className="w-full">
              {/* FIX: Sin propiedad 'tooltip' para evitar bucles infinitos */}
              <SidebarMenuButton
                isActive={pathname.startsWith(item.href)}
                className="w-full justify-start"
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </nav>
  )
}