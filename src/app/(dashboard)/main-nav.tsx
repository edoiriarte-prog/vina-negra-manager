"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, Users, ShoppingCart, Truck, 
  Package, Settings, FileText, LogOut,
  Landmark, // Icono Tesorería
  BookOpen,  // Icono Cta. Corriente
  FileSliders,
  PackageCheck
} from "lucide-react";

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();

  const routes = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: pathname === "/dashboard" },
    { href: "/contacts", label: "Contactos", icon: Users, active: pathname.includes("/contacts") },
    { href: "/purchases", label: "Compras (O/C)", icon: ShoppingCart, active: pathname.includes("/purchases") },
    { href: "/sales", label: "Ventas (O/V)", icon: Truck, active: pathname.includes("/sales") },
    { href: "/inventory", label: "Inventario", icon: Package, active: pathname.includes("/inventory") },
    { href: "/inventory-adjustments", label: "Ajustes de Stock", icon: FileSliders },
    { href: "/dispatches", label: "Orden de Salida", icon: PackageCheck },
    { href: "/financials", label: "Tesorería", icon: Landmark, active: pathname.includes("/financials") },
    { href: "/mercantile-account", label: "Cta. Corriente", icon: BookOpen, active: pathname.includes("/mercantile-account") },
    { href: "/reports", label: "Reportes", icon: FileText, active: pathname.includes("/reports") },
    { href: "/settings", label: "Configuración", icon: Settings, active: pathname.includes("/settings") },
  ];

  return (
    <nav className={cn("flex flex-col h-full bg-slate-900 border-r border-slate-800 w-64 fixed left-0 top-0 bottom-0 z-50", className)} {...props}>
      {/* LOGO */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                <span className="text-white font-bold text-lg">VN</span>
            </div>
            <div>
                <h1 className="font-bold text-slate-100 tracking-tight leading-none">Viña Negra</h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Manager</p>
            </div>
        </div>
      </div>

      {/* LINKS */}
      <div className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 group relative",
              pathname.startsWith(route.href) && route.href !== "/" || pathname === route.href
                ? "bg-blue-600/10 text-blue-400 shadow-sm border border-blue-600/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
            )}
          >
            {(pathname.startsWith(route.href) && route.href !== "/" || pathname === route.href) && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-blue-500 rounded-r-full" />
            )}
            <route.icon className={cn("mr-3 h-5 w-5 transition-colors", (pathname.startsWith(route.href) && route.href !== "/" || pathname === route.href) ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
            {route.label}
          </Link>
        ))}
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-slate-400 rounded-md hover:bg-red-900/20 hover:text-red-400 transition-colors">
            <LogOut className="mr-3 h-5 w-5" />
            Cerrar Sesión
        </button>
      </div>
    </nav>
  );
}
