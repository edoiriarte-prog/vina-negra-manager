"use client";

import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/hooks/use-sidebar';

export function SettingsLink() {
  const { state } = useSidebar();
  return (
    <Link href="/settings" className="mt-auto">
       <Button variant="ghost" className="w-full justify-start gap-3 p-2 text-sm h-10 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-2">
        <Settings className="h-5 w-5" />
        <span className="truncate group-data-[collapsible=icon]:hidden">Configuración</span>
       </Button>
    </Link>
  )
}
