'use client';

import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronRight } from 'lucide-react';
import { useSidebar } from './ui/sidebar';

export function UserNav() {
  const { state } = useSidebar();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-14 w-full justify-start px-2 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://picsum.photos/seed/100/40/40" data-ai-hint="person avatar" />
            <AvatarFallback>VN</AvatarFallback>
          </Avatar>
          <div className="ml-2 flex-1 text-left group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium">Viña Negra</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        align={state === 'collapsed' ? 'center' : 'end'}
        side={state === 'collapsed' ? 'right' : 'top'}
        sideOffset={8}
      >
        <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Perfil</DropdownMenuItem>
        <Link href="/settings">
          <DropdownMenuItem>
            Configuración
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Cerrar Sesión</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
