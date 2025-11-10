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
import { ChevronRight, LogIn, LogOut } from 'lucide-react';
import { useSidebar } from './ui/sidebar';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export function UserNav() {
  const { state } = useSidebar();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();


  const handleSignOut = async () => {
     try {
      await signOut(auth);
      toast({ title: 'Sesión Cerrada' });
      router.push('/login');
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cerrar la sesión.' });
    }
  }


  if (isUserLoading) {
    return <div className="h-14 w-full" />;
  }

  if (!user) {
    return (
      <Link href="/login" className="w-full">
       <Button
          variant="outline"
          className="h-14 w-full justify-start px-2 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <LogIn className="h-5 w-5" />
           <span className="ml-2 flex-1 text-left group-data-[collapsible=icon]:hidden">
              Iniciar Sesión
            </span>
       </Button>
      </Link>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-14 w-full justify-start px-2 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.photoURL || "https://picsum.photos/seed/100/40/40"} data-ai-hint="person avatar" />
            <AvatarFallback>{user.isAnonymous ? 'AN' : (user.email?.charAt(0)?.toUpperCase() || 'U')}</AvatarFallback>
          </Avatar>
          <div className="ml-2 flex-1 text-left group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium">{user.displayName || (user.isAnonymous ? 'Usuario Anónimo' : (user.email || 'Usuario'))}</p>
            {!user.isAnonymous && <p className="text-xs text-muted-foreground">{user.uid}</p>}
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
        <DropdownMenuItem onClick={handleSignOut}>Cerrar Sesión</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
