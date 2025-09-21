'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Boxes,
  LayoutDashboard,
  Landmark,
  ShoppingCart,
  ShoppingBag,
  Truck,
  Users,
  BarChart,
  CalendarClock,
} from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contacts', label: 'Contactos', icon: Users },
  { href: '/purchases', label: 'Compras (O/C)', icon: ShoppingBag },
  { href: '/sales', label: 'Ventas (O/V)', icon: ShoppingCart },
  { href: '/services', label: 'Servicios (O/S)', icon: Truck },
  { href: '/inventory', label: 'Inventario', icon: Boxes },
  { href: '/financials', label: 'Movimientos', icon: Landmark },
];

const reportItems = [
    { href: '/reports', label: 'Cuentas Corrientes', exact: true },
    { href: '/reports/upcoming-payments', label: 'Vencimientos por Cobrar' },
];

export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn('flex flex-col', className)}>
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

        <Collapsible asChild>
            <SidebarMenuItem>
                 <CollapsibleTrigger asChild>
                     <SidebarMenuButton tooltip='Informes' isActive={pathname.startsWith('/reports')}>
                        <BarChart className="h-5 w-5" />
                        <span>Informes</span>
                    </SidebarMenuButton>
                 </CollapsibleTrigger>
                <CollapsibleContent asChild>
                    <SidebarMenuSub>
                        {reportItems.map(item => (
                             <SidebarMenuSubItem key={item.href}>
                                <Link href={item.href}>
                                    <SidebarMenuSubButton isActive={item.exact ? pathname === item.href : pathname.startsWith(item.href)}>
                                        <span>{item.label}</span>
                                    </SidebarMenuSubButton>
                                </Link>
                            </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </nav>
  );
}
