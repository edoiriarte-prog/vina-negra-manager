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
} from "lucide-react"

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contactos", icon: Users },
  { href: "/purchases", label: "Compras (O/C)", icon: ShoppingBag },
  { href: "/sales", label: "Ventas (O/V)", icon: ShoppingCart },
  { href: "/services", label: "Servicios (O/S)", icon: Truck },
  { href: "/inventory", label: "Inventario", icon: Boxes },
  { href: "/financials", label: "Movimientos", icon: Landmark },
  { href: "/reports", label: "Informes", icon: BarChart },
  { href: "/help", label: "Ayuda", icon: HelpCircle },
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
