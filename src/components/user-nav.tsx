'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { useUser } from '@/firebase';

export function UserNav() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading || !user) {
    return (
        <div className="h-14 w-full justify-start px-2 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 flex items-center">
             <User className="h-5 w-5" />
             <span className="ml-2 flex-1 text-left group-data-[collapsible=icon]:hidden">
                Cargando...
            </span>
        </div>
    );
  }

  return (
    <div className="h-14 w-full justify-start px-2 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 flex items-center">
        <Avatar className="h-8 w-8">
            <AvatarImage src={"https://picsum.photos/seed/100/40/40"} data-ai-hint="person avatar" />
            <AvatarFallback>AN</AvatarFallback>
        </Avatar>
        <div className="ml-2 flex-1 text-left group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium">Usuario Anónimo</p>
            <p className="text-xs text-muted-foreground truncate">{user.uid}</p>
        </div>
    </div>
  );
}
